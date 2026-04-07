import createMcpServer from "../node_modules/@benborla29/mcp-server-mysql/dist/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

async function main() {
    try {
        const mcpServer = createMcpServer({ config: { debug: false } });
        const transport = new StdioServerTransport();
        await mcpServer.connect(transport);
        console.error("MySQL MCP Server started and listening on stdio");
    } catch (error) {
        console.error("Server error:", error);
        process.exit(1);
    }
}

main();


