# Contributing to Polarion MCP Server

## 👋 Welcome Junior Developers!

Thank you for your interest in contributing! This guide will help you get started, even if you're new to open source or this type of project.

## Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR-USERNAME/polarion-mcp.git
cd polarion-mcp

# Add upstream remote to stay in sync
git remote add upstream https://github.com/phillipboesger/polarion-mcp.git
```

### 2. Install Dependencies

```bash
# Install Node.js packages
npm install
```

> Optional: the local Polarion SDK PDF features rely on files that are not
> bundled in this repo (see [`sdk/README.md`](./sdk/README.md)). If you add
> those large PDFs, consider tracking them with
> [Git LFS](https://git-lfs.github.com/) (`git lfs install`).

### 3. Set Up Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and add your credentials
# API_BASE_URL=https://your-polarion.com/polarion/rest/v1
# BEARER_TOKEN=your_token_here
```

### 4. Build and Test

```bash
# Compile TypeScript
npm run build

# Run the server (for testing)
npm start
```

## Code Style Guide

### General Principles

1. **Write for readability** - Code is read more than written
2. **Comment your intent** - Explain why, not just what
3. **Keep it simple** - Simple solutions are often best
4. **Test your changes** - Make sure nothing breaks

### TypeScript Style

```typescript
// ✅ GOOD: Clear function with documentation
/**
 * Fetches a work item from Polarion
 *
 * @param projectId - The project containing the work item
 * @param workItemId - The ID of the work item to fetch
 * @returns The work item data or null if not found
 */
async function getWorkItem(projectId: string, workItemId: string): Promise<WorkItem | null> {
  // Implementation...
}

// ❌ BAD: No documentation, unclear names
async function get(p: string, w: string) {
  // Implementation...
}
```

### Documentation Requirements

Every public function should have:

```typescript
/**
 * Brief description of what the function does
 *
 * Longer explanation if needed:
 * - Key behavior
 * - Important notes
 * - Examples if helpful
 *
 * @param paramName - Description of parameter
 * @param anotherParam - Description of another parameter
 * @returns Description of return value
 * @throws Description of any errors thrown
 */
```

### Error Handling

```typescript
// ✅ GOOD: Proper error handling
try {
  const result = await riskyOperation();
  return result;
} catch (error: unknown) {
  // Type-safe error handling
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[ERROR] Operation failed: ${errorMessage}`);
  throw new Error(`Failed to complete operation: ${errorMessage}`);
}

// ❌ BAD: No error handling
const result = await riskyOperation();
return result;
```

### Logging

```typescript
// Use console.error() for all logging (stdout is reserved for MCP protocol)

console.error('[INFO] Starting operation...');     // Informational messages
console.error('[WARN] Token expires soon');        // Warnings
console.error('[ERROR] Request failed:', error);   // Errors
```

## Common Contribution Types

### 1. Adding Documentation

**What to do:**
- Add JSDoc comments to undocumented functions
- Improve existing comments for clarity
- Add examples to complex functions

**Example:**
```typescript
// Before
function sanitizeKey(k: string) {
  return k.replace(/[^\w.-]/g, "_").slice(0, 64);
}

// After
/**
 * Sanitizes a property key to match MCP requirements
 *
 * MCP protocol requires property names to:
 * - Contain only letters, numbers, underscores, dots, or hyphens
 * - Be 1-64 characters long
 *
 * Examples:
 * - "page[size]" -> "page_size_"
 * - "content-type" -> "content-type" (already valid)
 *
 * @param k - The original key to sanitize
 * @returns The sanitized key
 */
function sanitizeKey(k: string): string {
  return k.replace(/[^\w.-]/g, "_").slice(0, 64);
}
```

### 2. Fixing Bugs

**Process:**
1. Create an issue describing the bug
2. Write a test that demonstrates the bug
3. Fix the bug
4. Verify the test now passes
5. Submit a pull request

**Commit message format:**
```
fix: Brief description of bug fix

Longer explanation of:
- What was wrong
- Why it happened
- How you fixed it

Fixes #123
```

### 3. Adding Features

**Process:**
1. Discuss the feature in an issue first
2. Get approval from maintainers
3. Implement the feature
4. Add tests
5. Update documentation
6. Submit pull request

**Commit message format:**
```
feat: Brief description of feature

Explanation of:
- What the feature does
- Why it's useful
- How to use it

Closes #456
```

### 4. Improving Performance

**Process:**
1. Identify the performance issue (with benchmarks if possible)
2. Create an issue with details
3. Implement optimization
4. Measure improvement
5. Submit pull request with before/after metrics

## Git Workflow

### Creating a Feature Branch

```bash
# Update your fork
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
```

### Making Commits

```bash
# Stage your changes
git add .

# Commit with meaningful message
git commit -m "feat: add project configuration validation"

# Push to your fork
git push origin feature/your-feature-name
```

### Submitting a Pull Request

1. Push your branch to your fork
2. Go to GitHub and create a Pull Request
3. Fill out the PR template
4. Wait for review
5. Address any feedback
6. Once approved, maintainers will merge

## Code Review Process

### What Reviewers Look For

- **Correctness**: Does the code work as intended?
- **Testing**: Are there tests? Do they pass?
- **Documentation**: Is the code well-documented?
- **Style**: Does it follow our style guide?
- **Performance**: Are there any obvious performance issues?
- **Security**: Are there any security concerns?

### Responding to Feedback

- Be open to suggestions
- Ask questions if you don't understand
- Make requested changes promptly
- Thank reviewers for their time

## Testing Your Code

### Manual Testing

```bash
# Build the project
npm run build

# Test with a real Polarion instance
# (Set up .env with valid credentials)
npm start
```

### Type Checking

```bash
# Check for TypeScript errors without building
npm run typecheck
```

## Getting Help

### Where to Ask Questions

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and ideas
- **Code Comments**: Tag maintainers with `@username`

### Good Question Format

```
I'm trying to [what you're trying to do].

I expected [expected behavior], but instead [actual behavior].

Here's the code I'm working with:
[code snippet]

And here's the error I'm getting:
[error message]

I've tried:
- [thing 1]
- [thing 2]

What am I missing?
```

## Resources for Learning

### Project-Specific
- **MCP Protocol**: https://modelcontextprotocol.io/
- **Polarion REST API**: Check `POLARION_RESOURCES` in `src/config.ts`

### General Development
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Git Tutorial**: https://git-scm.com/book/en/v2
- **Conventional Commits**: https://www.conventionalcommits.org/

### Libraries We Use
- **Axios** (HTTP client): https://axios-http.com/
- **Zod** (Validation): https://zod.dev/
- **MCP SDK**: https://github.com/modelcontextprotocol/sdk

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

## Questions?

Don't hesitate to ask! We were all beginners once. The only "stupid question" is the one you don't ask.

Happy coding! 🚀
