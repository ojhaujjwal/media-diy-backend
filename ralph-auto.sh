#!/bin/bash

# Ralph Auto Loop - Autonomous AI coding agent that implements specs
#
# This script runs an autonomous agent to implement a specific task.
# A focus prompt is REQUIRED - the agent will only do what you ask.
#
# Usage: ./ralph-auto.sh <focus prompt> [options]
#
# Options:
#   --model <name>          Override model (default: opencode-go/glm-5)
#   --skip-checks           Skip all CI checks (typecheck, lint, build, tests)
#   --max-iterations <n>    Stop after n iterations (default: unlimited)
#
# Examples:
#   ./ralph-auto.sh "Fix the authentication bug in login flow"
#   ./ralph-auto.sh "Implement the exchange rate sync feature" --max-iterations 5
#   ./ralph-auto.sh "Quick experiment" --skip-checks
#
# The loop continues until the task is complete (TASK_COMPLETE signal)
# COMMITS ARE HANDLED BY THIS SCRIPT, NOT THE AGENT.

set -e
set -o pipefail

# Parse arguments
DEFAULT_MODEL="opencode-go/minimax-2.7"
MODEL="$DEFAULT_MODEL"
SKIP_CHECKS=false
FOCUS_PROMPT=""
MAX_ITERATIONS=0

while [[ $# -gt 0 ]]; do
    case $1 in
        --model)
            if [[ -n "$2" ]]; then
                MODEL="$2"
                shift 2
            else
                echo "Error: --model requires a model name"
                exit 1
            fi
            ;;
        --skip-checks)
            SKIP_CHECKS=true
            shift
            ;;
        --max-iterations)
            if [[ -n "$2" && "$2" =~ ^[0-9]+$ ]]; then
                MAX_ITERATIONS="$2"
                shift 2
            else
                echo "Error: --max-iterations requires a positive integer"
                exit 1
            fi
            ;;
        --help|-h)
            echo "Usage: ./ralph-auto.sh <focus prompt> [options]"
            echo ""
            echo "A focus prompt is REQUIRED. The agent will only do what you ask."
            echo ""
            echo "Options:"
            echo "  --model <name>          Override model (default: $DEFAULT_MODEL)"
            echo "  --skip-checks           Skip all CI checks (typecheck, lint, build, tests)"
            echo "  --max-iterations <n>    Stop after n iterations (default: unlimited)"
            echo "  --help, -h             Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./ralph-auto.sh \"Fix the authentication bug\""
            echo "  ./ralph-auto.sh \"Implement rate limiting\" --max-iterations 5"
            echo "  ./ralph-auto.sh \"Quick fix\" --skip-checks"
            exit 0
            ;;
        -*)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
        *)
            if [[ -z "$FOCUS_PROMPT" ]]; then
                FOCUS_PROMPT="$1"
            else
                echo "Error: Multiple focus prompts provided"
                exit 1
            fi
            shift
            ;;
    esac
done

# Focus prompt is required
if [[ -z "$FOCUS_PROMPT" ]]; then
    echo "Error: A focus prompt is required"
    echo ""
    echo "Usage: ./ralph-auto.sh <focus prompt> [options]"
    echo ""
    echo "Examples:"
    echo "  ./ralph-auto.sh \"Fix the authentication bug\""
    echo "  ./ralph-auto.sh \"Implement rate limiting\""
    echo ""
    echo "Use --help for more information"
    exit 1
fi

# Configuration
PROGRESS_FILE="progress-auto.txt"
PROMPT_TEMPLATE="RALPH_AUTO_PROMPT.md"
COMPLETE_MARKER="NOTHING_LEFT_TO_DO"
OUTPUT_DIR=".ralph-auto"
AGENT_CMD="opencode --model $MODEL"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Track child processes for cleanup
CHILD_PIDS=""

# Cleanup function
cleanup() {
    if [ -n "$CHILD_PIDS" ]; then
        for pid in $CHILD_PIDS; do
            if kill -0 "$pid" 2>/dev/null; then
                kill -TERM "$pid" 2>/dev/null || true
                sleep 0.5
                if kill -0 "$pid" 2>/dev/null; then
                    kill -9 "$pid" 2>/dev/null || true
                fi
            fi
        done
    fi

    pkill -P $$ 2>/dev/null || true

    if [ -d "$OUTPUT_DIR" ]; then
        rm -rf "$OUTPUT_DIR"
        echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} Cleaned up $OUTPUT_DIR"
    fi
}

# Signal handler for graceful shutdown
handle_signal() {
    echo ""
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} Received interrupt signal, shutting down..."
    cleanup
    exit 130
}

trap cleanup EXIT
trap handle_signal INT TERM

# Create output directory for logs
mkdir -p "$OUTPUT_DIR"

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    case $level in
        "INFO")  echo -e "${BLUE}[$timestamp]${NC} $message" ;;
        "SUCCESS") echo -e "${GREEN}[$timestamp]${NC} $message" ;;
        "WARN")  echo -e "${YELLOW}[$timestamp]${NC} $message" ;;
        "ERROR") echo -e "${RED}[$timestamp]${NC} $message" ;;
    esac

    echo "[$timestamp] [$level] $message" >> "$OUTPUT_DIR/ralph-auto.log"
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."

    if ! command -v opencode &> /dev/null; then
        log "ERROR" "opencode is not installed or not in PATH"
        exit 1
    fi

    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log "ERROR" "Not in a git repository"
        exit 1
    fi

    if [ ! -d "specs" ]; then
        log "ERROR" "specs/ directory not found"
        exit 1
    fi

    local spec_count=$(find specs -name "*.md" -type f 2>/dev/null | wc -l | tr -d ' ')
    if [ "$spec_count" -eq 0 ]; then
        log "ERROR" "No .md files found in specs/ directory"
        exit 1
    fi

    log "INFO" "Found $spec_count spec file(s) in specs/"

    if [ ! -f "$PROMPT_TEMPLATE" ]; then
        log "ERROR" "$PROMPT_TEMPLATE not found"
        exit 1
    fi

    if [ ! -f "$PROGRESS_FILE" ]; then
        echo "# Ralph Auto Progress Log" > "$PROGRESS_FILE"
        echo "# This file tracks autonomous task completions" >> "$PROGRESS_FILE"
        echo "" >> "$PROGRESS_FILE"
    fi

    log "SUCCESS" "Prerequisites check passed"
}

# Check if there are uncommitted changes
has_changes() {
    ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]
}

# Run CI checks
run_ci_checks() {
    log "INFO" "Running CI checks..."

    local ci_failed=0
    local error_output=""

    echo "=========================================="
    echo "Running CI Checks"
    echo "=========================================="

    # Type checking
    echo ""
    echo "1. Type Checking..."
    echo "-------------------"
    local typecheck_output
    if typecheck_output=$(npm run typecheck 2>&1); then
        echo -e "${GREEN}Type check passed${NC}"
    else
        echo -e "${RED}Type check failed${NC}"
        ci_failed=1
        error_output+="## Type Check Failed

Command: \`npm run typecheck\`

\`\`\`
$typecheck_output
\`\`\`

"
    fi

    # Linting
    echo ""
    echo "2. Linting..."
    echo "-------------"
    local lint_output
    if lint_output=$(npm run lint 2>&1); then
        echo -e "${GREEN}Lint passed${NC}"
    else
        echo -e "${RED}Lint failed${NC}"
        ci_failed=1
        error_output+="## Lint Failed

Command: \`npm run lint\`

\`\`\`
$lint_output
\`\`\`

"
    fi

    # Building
    echo ""
    echo "3. Building..."
    echo "--------------"
    local build_output
    if build_output=$(npm run build 2>&1); then
        echo -e "${GREEN}Build passed${NC}"
    else
        echo -e "${RED}Build failed${NC}"
        ci_failed=1
        error_output+="## Build Failed

Command: \`npm run build\`

\`\`\`
$build_output
\`\`\`

"
    fi

    # Testing
    echo ""
    echo "4. Running Tests..."
    echo "-------------------"
    local test_output
    if test_output=$(npm test 2>&1); then
        echo -e "${GREEN}Tests passed${NC}"
    else
        echo -e "${RED}Tests failed${NC}"
        ci_failed=1
        error_output+="## Unit Tests Failed

Command: \`npm test\`

\`\`\`
$test_output
\`\`\`

"
    fi

    # Check changed files for eslint-disable
    echo ""
    echo "5. Checking for eslint-disable in changed files..."
    echo "---------------------------------------------------"
    local eslint_bypass_output
    eslint_bypass_output=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null | grep -E '\.(ts|tsx)$' | xargs -r grep -l 'eslint-disable' 2>/dev/null || true)
    if [ -z "$eslint_bypass_output" ]; then
        eslint_bypass_output=$(git diff --name-only --diff-filter=ACM 2>/dev/null | grep -E '\.(ts|tsx)$' | xargs -r grep -l 'eslint-disable' 2>/dev/null || true)
    fi
    if [ -n "$eslint_bypass_output" ]; then
        echo -e "${RED}Found eslint-disable comments in changed files${NC}"
        echo "$eslint_bypass_output"
        ci_failed=1
        error_output+="## ESLint Bypass Detected

The following files contain \`eslint-disable\` comments which are not allowed:

\`\`\`
$eslint_bypass_output
\`\`\`

Fix the underlying issues instead of disabling lint rules.

"
    else
        echo -e "${GREEN}No eslint-disable in changed files${NC}"
    fi

    # Summary
    echo ""
    echo "=========================================="
    if [ $ci_failed -eq 0 ]; then
        echo -e "${GREEN}All CI checks passed!${NC}"
        log "SUCCESS" "CI checks passed"
        return 0
    else
        echo -e "${RED}CI checks failed!${NC}"
        log "ERROR" "CI checks failed"
        cat > "$OUTPUT_DIR/ci_errors.txt" << EOF
# CI Check Failures

The previous iteration failed CI checks. You MUST fix these errors before continuing.

$error_output
EOF
        return 1
    fi
}

# Commit changes with auto-generated message
commit_changes() {
    local iteration="$1"
    local task_summary="$2"

    log "INFO" "Committing changes..."

    git add -A

    if git diff --cached --quiet; then
        log "WARN" "No changes to commit"
        return 0
    fi

    local commit_msg="feat(auto): $task_summary

Ralph-Auto-Iteration: $iteration

Automated commit by Ralph Auto loop."

    if git commit -m "$commit_msg"; then
        log "SUCCESS" "Committed: $task_summary"
        return 0
    else
        log "ERROR" "Commit failed"
        return 1
    fi
}

# Rollback uncommitted changes
rollback_changes() {
    log "WARN" "Rolling back uncommitted changes..."
    git checkout -- .
    git clean -fd
}

# Build the prompt for the agent
build_prompt() {
    local iteration=$1
    local ci_errors=""
    local progress_content=""
    local focus_section=""

    if [ -f "$OUTPUT_DIR/ci_errors.txt" ]; then
        ci_errors="## Previous Iteration Errors

**CI checks failed in the previous iteration. You MUST fix these errors.**

Read the error details from: \`$OUTPUT_DIR/ci_errors.txt\`
"
    fi

    if [ -f "$PROGRESS_FILE" ]; then
        progress_content="## Progress So Far

\`\`\`
$(cat "$PROGRESS_FILE")
\`\`\`
"
    fi

    focus_section="## Focus Mode (User-Specified)

**The user has specified that you should ONLY work on the following task:**

> $FOCUS_PROMPT

Work exclusively on this task. When the task is complete, signal TASK_COMPLETE. Do NOT select other tasks from specs - only do what is specified above.

"

    local specs_list=$(find specs -name "*.md" -type f | sort | while read f; do echo "- \`$f\`"; done)

    local prompt=$(cat "$PROMPT_TEMPLATE")
    prompt="${prompt//\{\{SPECS_LIST\}\}/$specs_list}"
    prompt="${prompt//\{\{ITERATION\}\}/$iteration}"
    prompt="${prompt//\{\{CI_ERRORS\}\}/$ci_errors}"
    prompt="${prompt//\{\{PROGRESS\}\}/$progress_content}"
    prompt="${prompt//\{\{FOCUS\}\}/$focus_section}"

    echo "$prompt"
}

# Extract task description from output
extract_task_description() {
    local output_file="$1"
    local desc=""

    desc=$(cat "$output_file" | \
        grep "TASK_COMPLETE:" | \
        head -1 | \
        sed 's/.*TASK_COMPLETE:[[:space:]]*//')

    if [ -n "$desc" ]; then
        echo "$desc"
    else
        echo "Autonomous improvements"
    fi
}

# Check for TASK_COMPLETE or NOTHING_LEFT_TO_DO signals
check_signals() {
    local output_file="$1"
    local content
    content=$(cat "$output_file" 2>/dev/null || echo "")

    local has_task_complete=false
    local has_nothing_left=false

    if echo "$content" | grep -q "TASK_COMPLETE"; then
        has_task_complete=true
    fi
    if echo "$content" | grep -q "$COMPLETE_MARKER"; then
        has_nothing_left=true
    fi

    echo "$has_task_complete|$has_nothing_left"
}

# Run a single iteration of the agent
run_iteration() {
    local iteration=$1
    local output_file="$OUTPUT_DIR/iteration_${iteration}_output.txt"

    log "INFO" "Starting iteration $iteration"

    local prompt=$(build_prompt "$iteration")

    local prompt_file="$OUTPUT_DIR/iteration_${iteration}_prompt.md"
    echo "$prompt" > "$prompt_file"

    local prompt_lines=$(echo "$prompt" | wc -l | tr -d ' ')
    local has_ci_errors="no"
    if [ -f "$OUTPUT_DIR/ci_errors.txt" ]; then
        has_ci_errors="yes"
    fi
    log "INFO" "Prompt: $prompt_lines lines, CI errors: $has_ci_errors"
    log "INFO" "Prompt file: $prompt_file"

    log "INFO" "Running opencode agent..."
    echo ""

    local agent_exit_code=0
    if $AGENT_CMD < "$prompt_file" > "$output_file" 2>&1; then
        echo ""
        log "SUCCESS" "Agent completed iteration $iteration"
    else
        agent_exit_code=$?
        echo ""
        if [ $agent_exit_code -eq 130 ] || [ $agent_exit_code -eq 143 ]; then
            log "INFO" "Agent interrupted by user"
            return 1
        fi
        log "WARN" "Agent exited with non-zero status ($agent_exit_code)"
    fi

    local signals=$(check_signals "$output_file")
    local has_task_complete=$(echo "$signals" | cut -d'|' -f1)
    local has_nothing_left=$(echo "$signals" | cut -d'|' -f2)

    if [ "$has_task_complete" = true ]; then
        log "INFO" "Agent signaled task completion"

        local task_desc=$(extract_task_description "$output_file")

        local ci_passed=true
        if [ "$SKIP_CHECKS" = true ]; then
            log "INFO" "Skipping CI checks (--skip-checks)"
        elif ! run_ci_checks; then
            ci_passed=false
        fi

        if [ "$ci_passed" = true ]; then
            echo "" >> "$PROGRESS_FILE"
            echo "## Iteration $iteration - $(date '+%Y-%m-%d %H:%M')" >> "$PROGRESS_FILE"
            echo "**Task**: $task_desc" >> "$PROGRESS_FILE"
            echo "**Status**: complete" >> "$PROGRESS_FILE"
            echo "---" >> "$PROGRESS_FILE"

            rm -f "$OUTPUT_DIR/ci_errors.txt"

            if commit_changes "$iteration" "$task_desc"; then
                log "SUCCESS" "Task completed and committed: $task_desc"
            else
                log "ERROR" "Failed to commit changes"
                rollback_changes
                return 1
            fi
        else
            log "WARN" "CI checks failed - keeping changes for next iteration to fix"
            return 1
        fi
    elif has_changes; then
        log "WARN" "Agent did not signal TASK_COMPLETE but has uncommitted changes"

        local ci_passed=true
        if [ "$SKIP_CHECKS" = true ]; then
            log "INFO" "Skipping CI checks (--skip-checks)"
        else
            log "INFO" "Found uncommitted changes, running CI checks..."
            if ! run_ci_checks; then
                ci_passed=false
            fi
        fi

        if [ "$ci_passed" = true ]; then
            echo "" >> "$PROGRESS_FILE"
            echo "## Iteration $iteration - $(date '+%Y-%m-%d %H:%M')" >> "$PROGRESS_FILE"
            echo "**Task**: Partial work (no explicit completion signal)" >> "$PROGRESS_FILE"
            echo "---" >> "$PROGRESS_FILE"

            rm -f "$OUTPUT_DIR/ci_errors.txt"

            if commit_changes "$iteration" "Partial work from iteration $iteration"; then
                log "SUCCESS" "Partial work committed"
            fi
        fi
    fi

    if [ "$has_nothing_left" = true ]; then
        if [ -f "$OUTPUT_DIR/ci_errors.txt" ]; then
            log "WARN" "Agent signaled NOTHING_LEFT_TO_DO but CI errors exist - continuing to fix errors"
            return 1
        else
            log "SUCCESS" "Agent signaled NOTHING_LEFT_TO_DO"
            return 0
        fi
    fi

    return 1
}

# Main loop
main() {
    log "INFO" "=========================================="
    log "INFO" "Starting Ralph Auto Loop"
    log "INFO" "=========================================="

    log "INFO" "Focus: $FOCUS_PROMPT"
    log "INFO" "Model: $MODEL"
    if [ "$MAX_ITERATIONS" -gt 0 ]; then
        log "INFO" "Max iterations: $MAX_ITERATIONS"
    fi
    if [ "$SKIP_CHECKS" = true ]; then
        log "WARN" "Skip checks: enabled (no CI validation)"
    fi

    check_prerequisites

    local start_time=$(date +%s)
    local iteration=1
    local completed=false

    if [ "$SKIP_CHECKS" = true ]; then
        log "INFO" "Skipping initial CI checks (--skip-checks)"
        rm -f "$OUTPUT_DIR/ci_errors.txt"
    else
        log "INFO" "Running initial CI checks..."
        if ! run_ci_checks; then
            log "WARN" "Initial CI checks failed - errors will be included in prompt for agent to fix"
        else
            log "SUCCESS" "Initial CI checks passed - starting with clean slate"
            rm -f "$OUTPUT_DIR/ci_errors.txt"
        fi
    fi

    while true; do
        log "INFO" "------------------------------------------"
        log "INFO" "ITERATION $iteration"
        if [ "$MAX_ITERATIONS" -gt 0 ]; then
            log "INFO" "(max: $MAX_ITERATIONS)"
        fi
        log "INFO" "Focus: $FOCUS_PROMPT"
        log "INFO" "------------------------------------------"

        if run_iteration $iteration; then
            log "SUCCESS" "Nothing left to do!"
            completed=true
            break
        fi

        if [ "$MAX_ITERATIONS" -gt 0 ] && [ "$iteration" -ge "$MAX_ITERATIONS" ]; then
            log "WARN" "Reached max iterations ($MAX_ITERATIONS) - stopping"
            break
        fi

        sleep 2

        ((iteration++))
    done

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    log "INFO" "=========================================="
    log "INFO" "Ralph Auto Loop Complete"
    log "INFO" "Total iterations: $iteration"
    log "INFO" "Duration: ${duration}s"

    if [ "$completed" = true ]; then
        log "SUCCESS" "All work completed successfully!"
    fi
    log "INFO" "=========================================="

    log "INFO" "Recent Ralph Auto commits:"
    git log --oneline -10 --grep="Ralph-Auto" || true

    exit 0
}

main