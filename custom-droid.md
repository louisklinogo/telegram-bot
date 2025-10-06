# Using Factory Droids

> Learn how to effectively use Factory's specialized Droids to accelerate your development workflow

## Overview

Factory Droids are specialized AI assistants designed to excel at specific types of development tasks. Each Droid comes pre-configured with optimized system prompts, carefully selected tools, and the ideal model to deliver exceptional performance for particular use cases. This guide will help you understand when and how to use each Droid type effectively.

## Code Droid

### When to Use Code Droid

Code Droid is your go-to assistant for all coding-related tasks, including:

* Writing new features or components
* Refactoring existing code
* Debugging issues
* Creating unit tests
* Code reviews and improvements
* Understanding complex codebases

### Effective Usage Tips

<Steps>
  <Step title="Provide Clear Requirements">
    Be specific about what you want to build:

    "Create a React component that displays a paginated table of user data with sorting capabilities."
  </Step>

  <Step title="Include Relevant Context">
    Add repository context or specific files that are relevant to your task:

    "I'm working with our existing UserTable component at @file src/components/UserTable.jsx and need to add filtering functionality."
  </Step>

  <Step title="Specify Constraints">
    Mention any technical constraints or preferences:

    "We use Tailwind CSS for styling and need to maintain accessibility compliance."
  </Step>

  <Step title="Iterate and Refine">
    Provide feedback on generated code to refine the solution:

    "The solution looks good, but can we modify it to handle empty data states better?"
  </Step>
</Steps>

### Example Interactions

<AccordionGroup>
  <Accordion title="Feature Implementation">
    **You:** "I need to implement a password strength checker in our signup form that shows real-time feedback. We're using React with TypeScript."

    **Code Droid:** *Provides a detailed implementation with TypeScript interfaces, React component, strength calculation logic, and usage examples.*
  </Accordion>

  <Accordion title="Code Refactoring">
    **You:** "This function is too complex and has performance issues. Can you help refactor it? @file src/utils/dataProcessor.js"

    **Code Droid:** *Analyzes the code, identifies issues, and provides a refactored version with explanations of the improvements.*
  </Accordion>

  <Accordion title="Debugging">
    **You:** "I'm getting this error when trying to fetch data from our API: 'TypeError: Cannot read property 'data' of undefined'. Here's my code: @file src/services/apiClient.js"

    **Code Droid:** *Examines the code, identifies the root cause, and suggests a fix with proper error handling.*
  </Accordion>
</AccordionGroup>

## Reliability Droid

### When to Use Reliability Droid

Reliability Droid specializes in maintaining system stability and resolving incidents:

* Investigating production incidents
* Creating Root Cause Analysis (RCA) documents
* Analyzing error logs and stack traces
* Developing monitoring and alerting strategies
* Implementing error handling and recovery mechanisms
* Conducting post-mortems

### Effective Usage Tips

<Steps>
  <Step title="Share Incident Details">
    Provide comprehensive information about the incident:

    "We experienced an outage in our payment processing service at 2:00 PM. Here are the error logs and alerts we received."
  </Step>

  <Step title="Include Relevant Metrics">
    Share performance metrics and system behavior:

    "Our database connection pool was exhausted, and response times increased from 200ms to 5s."
  </Step>

  <Step title="Specify System Architecture">
    Describe the affected components and their relationships:

    "The issue occurred in our order processing microservice which communicates with both the payment gateway and inventory service."
  </Step>

  <Step title="Request Specific Deliverables">
    Clearly state what you need:

    "I need a comprehensive RCA document that I can share with stakeholders."
  </Step>
</Steps>

### Example Interactions

<AccordionGroup>
  <Accordion title="Incident Analysis">
    **You:** "We had an API outage yesterday for 45 minutes. Here are the logs showing increased error rates and the alert that triggered: \[paste logs]"

    **Reliability Droid:** *Analyzes the logs, identifies patterns, and provides a detailed breakdown of what likely happened with potential root causes.*
  </Accordion>

  <Accordion title="RCA Document Creation">
    **You:** "Based on our discussion about the database connection issue, can you create a formal RCA document that I can share with the team?"

    **Reliability Droid:** *Generates a structured RCA document with timeline, impact assessment, root cause identification, and preventative measures.*
  </Accordion>

  <Accordion title="Error Handling Strategy">
    **You:** "How should we improve our error handling in the payment processing service to prevent similar outages in the future?"

    **Reliability Droid:** *Provides a comprehensive error handling strategy with code examples, circuit breaker patterns, and retry mechanisms.*
  </Accordion>
</AccordionGroup>

## Knowledge Droid

### When to Use Knowledge Droid

Knowledge Droid excels at documentation and knowledge management:

* Answering questions about your codebase
* Creating technical documentation
* Explaining complex concepts or systems
* Generating API documentation
* Creating onboarding materials
* Summarizing technical discussions

### Effective Usage Tips

<Steps>
  <Step title="Ask Specific Questions">
    Frame your questions clearly:

    "How does our authentication system work? @repo our-company/auth-service"
  </Step>

  <Step title="Request Documentation">
    Specify the type of documentation you need:

    "Create API documentation for our user management endpoints based on @file src/controllers/userController.js"
  </Step>

  <Step title="Provide Context">
    Include relevant files or repositories:

    "I need to understand how our payment processing works. Here's our payment service: @repo our-company/payment-service"
  </Step>

  <Step title="Specify Format and Audience">
    Indicate your documentation requirements:

    "Create a technical guide for new developers explaining our database schema. Include diagrams and examples."
  </Step>
</Steps>

### Example Interactions

<AccordionGroup>
  <Accordion title="Codebase Explanation">
    **You:** "How does our authentication flow work? @repo our-company/auth-service"

    **Knowledge Droid:** *Provides a detailed explanation of the authentication flow, including sequence diagrams, key components, and security considerations.*
  </Accordion>

  <Accordion title="API Documentation">
    **You:** "Generate documentation for our REST API endpoints in @file src/routes/api.js"

    **Knowledge Droid:** *Creates comprehensive API documentation with endpoints, parameters, response formats, and example requests/responses.*
  </Accordion>

  <Accordion title="Concept Explanation">
    **You:** "Explain how our event sourcing architecture works and why we chose it."

    **Knowledge Droid:** *Delivers a clear explanation of event sourcing, its implementation in your system, benefits, tradeoffs, and example event flows.*
  </Accordion>
</AccordionGroup>

## Tutorial Droid

### When to Use Tutorial Droid

Tutorial Droid helps you learn and navigate Factory:

* Understanding Factory features and capabilities
* Learning how to use specific Factory functions
* Troubleshooting Factory issues
* Optimizing your Factory workflow
* Discovering best practices for Factory
* Onboarding new team members to Factory

### Effective Usage Tips

<Steps>
  <Step title="Ask About Specific Features">
    Inquire about particular Factory capabilities:

    "How do I use the @file command in Factory?"
  </Step>

  <Step title="Request Guided Walkthroughs">
    Ask for step-by-step instructions:

    "Walk me through how to connect my GitHub repository to Factory."
  </Step>

  <Step title="Seek Workflow Optimization">
    Ask how to improve your Factory experience:

    "What's the most efficient way to manage context in Factory for large codebases?"
  </Step>

  <Step title="Get Troubleshooting Help">
    Describe any issues you're experiencing:

    "I'm having trouble with updating a remote workspace. My setup commands are failing to execute."
  </Step>
</Steps>

### Example Interactions

<AccordionGroup>
  <Accordion title="Feature Explanation">
    **You:** "What are Droids in Factory and how do I use them?"

    **Tutorial Droid:** *Provides a comprehensive explanation of Droids, their types, when to use each one, and how to get started.*
  </Accordion>

  <Accordion title="Guided Setup">
    **You:** "How do I set up Factory Bridge on my local machine?"

    **Tutorial Droid:** *Delivers step-by-step instructions for downloading, installing, and configuring Factory Bridge with screenshots and troubleshooting tips.*
  </Accordion>

  <Accordion title="Best Practices">
    **You:** "What are some best practices for managing context in Factory?"

    **Tutorial Droid:** *Shares detailed best practices for context management, including tips for repository selection, file organization, and token optimization.*
  </Accordion>
</AccordionGroup>

## Best Practices for Using Droids

### 1. Choose the Right Droid

* **Match the task to the Droid**: Select the Droid that specializes in your current task type
* **Consider switching**: Don't hesitate to switch Droids if your task changes or spans multiple domains

### 2. Provide Clear Context

* **Be specific**: Clearly describe what you're trying to accomplish
* **Include relevant files**: Use @file, @repo, and other commands to provide necessary context
* **Share constraints**: Mention any technical limitations or requirements

### 3. Iterative Refinement

* **Start broad**: Begin with a general request and refine based on the response
* **Provide feedback**: Let the Droid know what's working and what needs improvement
* **Build on previous work**: Reference earlier parts of the conversation when iterating

### 4. Maximize Efficiency

* **Batch similar tasks**: Group related tasks together for a more cohesive experience
* **Save important sessions**: Bookmark sessions with valuable insights for future reference
* **Reuse context**: Maintain context across related tasks to avoid repetition

## Next Steps

<Card title="Explore Use Cases" icon="lightbulb" href="/user-guides/sessions-in-factory/use-cases">
  Discover practical applications of Factory Droids across different development scenarios
</Card>
