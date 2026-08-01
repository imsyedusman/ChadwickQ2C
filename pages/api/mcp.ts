import { NextApiRequest, NextApiResponse } from 'next';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { searchCatalog } from '@/lib/catalog-service';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = process.env.MCP_API_KEY;
  const authHeader = req.headers.authorization;

  if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const server = new McpServer({
    name: 'q2c',
    version: '0.1.0'
  });

  server.tool(
    'search_catalog',
    'Search the Q2C product catalog by keyword. Returns ranked results including part number, description, category, brand, unit price and labour hours. Use this to find items to add to a board.',
    {
      query: z.string(),
      brand: z.string().optional(),
      category: z.string().optional()
    },
    async ({ query, brand, category }) => {
      const results = await searchCatalog({ query, brand, category });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(results, null, 2)
          }
        ]
      };
    }
  );

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  await server.connect(transport);

  await transport.handleRequest(req, res);
}
