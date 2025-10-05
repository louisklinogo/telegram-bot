Configuration
Model Context Protocol

Copy page

Manage MCP servers and configurations in droid CLI

The /mcp command provides comprehensive management of MCP servers within Factory CLI, allowing you to configure, monitor, and maintain Model Context Protocol server connections.
Factory CLI currently only supports stdio-based MCP servers. Other transport types are not supported at this time.
​
Overview
MCP (Model Context Protocol) servers extend Factory’s capabilities by providing additional tools and context. The /mcp command lets you:
List all configured MCP servers and their status
Add new MCP servers to your configuration
Remove existing servers
View detailed information about specific servers
​
Usage

Copy

Ask AI
/mcp [options] [command]
​
Global Options
Option	Description
-h, --help	Display help for command
​
Available Commands
Command	Description
list	List configured MCP servers and their status
add <name> <command>	Add a new MCP server to the configuration
remove <name>	Remove an MCP server from the configuration
get <name>	Show details about a specific MCP server
help [command]	Display help for a specific command
If no command is specified, /mcp defaults to the list command.
​
Commands
​
list
Lists all configured MCP servers and displays their current status.

Copy

Ask AI
/mcp list [options]
Options:
-h, --help - Display help for the list command
Example:

Copy

Ask AI
/mcp list
​
add
Adds a new MCP server to your configuration.

Copy

Ask AI
/mcp add [options] <name> <command>
Arguments:
name - Server name (used as identifier)
command - Command to start the server
Options:
-e, --env <key=value...> - Environment variables (can be used multiple times)
--transport <type> - Transport type (defaults to “stdio”)
-h, --help - Display help for the add command
Examples:
Add a basic MCP server:

Copy

Ask AI
/mcp add myserver "node /path/to/server.js"
Add a server with environment variables:

Copy

Ask AI
/mcp add myserver "python server.py" -e API_KEY=secret123 -e DEBUG=true
​
remove
Removes an MCP server from the configuration.

Copy

Ask AI
/mcp remove [options] <name>
Arguments:
name - Server name to remove
Options:
-h, --help - Display help for the remove command
Example:

Copy

Ask AI
/mcp remove myserver
​
get
Shows detailed information about a specific MCP server.

Copy

Ask AI
/mcp get [options] <name>
Arguments:
name - Server name to get details for
Options:
-h, --help - Display help for the get command
Example:

Copy

Ask AI
/mcp get myserver
​
Getting Help
You can get help for the /mcp command and its subcommands in several ways:
/mcp --help or /mcp -h - Show general help
/mcp help - Show general help
/mcp help <command> - Show help for a specific command
/mcp <command> --help - Show help for a specific command
Examples:

Copy

Ask AI
/mcp --help
/mcp help add
/mcp add --help
​
Configuration
MCP server configurations are stored in a configuration file managed by Factory CLI. Each server configuration includes:
Name: Unique identifier for the server
Command: Shell command to start the server
Environment Variables: Optional environment variables passed to the server
Transport: Communication protocol (stdio only)
​
Stdio Transport
Factory CLI uses the stdio transport method for MCP servers, which means:
Communication happens over standard input/output streams
Servers must implement the MCP protocol over stdin/stdout
This is the most common and widely supported transport method for MCP servers
No network configuration or ports are required
​
Environment Variables
When adding servers, you can specify environment variables using the -e or --env flag:

Copy

Ask AI
/mcp add myserver "node server.js" -e NODE_ENV=production -e PORT=3000 -e API_URL=https://api.example.com
Environment variables must be in KEY=VALUE format. If a value contains an equals sign, everything after the first = is treated as the value.
​
Error Handling
The /mcp command provides clear error messages for common issues:
Invalid environment variable format: Check that variables use KEY=VALUE format
Server already exists: Use a different name or remove the existing server first
Unsupported transport type: Only “stdio” transport is supported
Unknown command: Use /mcp --help to see available commands
Missing arguments: Ensure all required arguments are provided
​
Examples
Here are some common usage patterns:
List all servers:

Copy

Ask AI
/mcp
# or
/mcp list
Add a Node.js MCP server:

Copy

Ask AI
/mcp add nodejs-server "node /path/to/mcp-server.js"
Add a Python server with environment variables:

Copy

Ask AI
/mcp add python-server "python /path/to/server.py" -e DEBUG=1 -e CONFIG_PATH=/etc/config
View server details:

Copy

Ask AI
/mcp get nodejs-server
Remove a server:

Copy

Ask AI
/mcp remove nodejs-server
Get help for a specific command:

Copy

Ask AI
/mcp help add
MCP servers extend Factory’s capabilities by providing additional tools and context. Make sure your MCP servers are compatible with the Model Context Protocol specification and support stdio transport.
Bring Your Own Key
Overview
Ask a question...

twitter