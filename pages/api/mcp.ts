import { NextApiRequest, NextApiResponse } from 'next';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { searchCatalog } from '@/lib/catalog-service';
import { searchProjects } from '@/lib/project-service';
import { createQuote } from '@/lib/quote-service';
import { createBoard } from '@/lib/board-service';

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

  server.tool(
    'search_projects',
    'Search for Q2C projects by name, company, or client. Returns matching projects including their ID, company name, and quote count. Use this to find the right project before creating a quote. One project name may return multiple results if multiple companies are tendering — always confirm which company the estimator wants before proceeding.',
    {
      query: z.string()
    },
    async ({ query }) => {
      const results = await searchProjects({ query });
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

  server.tool(
    'create_quote',
    'Create a new quote for an existing Q2C project. Requires the project ID obtained from search_projects. Returns the created quote including its auto-generated quote number.',
    {
      projectId: z.string()
    },
    async ({ projectId }) => {
      const result = await createQuote({ projectId });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    }
  );

  server.tool(
    'create_board',
    'Create and configure a board within a Q2C quote. Pass as much configuration as can be determined from the drawing — including location, material, IP rating, current rating, fault rating, metering, and construction parameters. The rules engine will automatically add dependent items such as busbars, CT assemblies, wiring, fuses, and delivery based on the configuration. Returns the created board.',
    {
      quoteId: z.string(),
      name: z.string(),
      type: z.string().describe("Exact board type string. Must be one of: 'Main Switchboard (MSB)', 'Main Distribution Board (MDB)', 'Distribution Board (DB)', 'Prewired Whole Current Meter Panel', 'Supply Authority CT Metering Enclosure 200-400A', 'Tee-Off-Box Riser', 'Tee-Off-Box End of Run', 'Remote Meter Panel with Test Block'"),
      location: z.string().optional().describe("'Indoor' or 'Outdoor'"),
      material: z.string().optional().describe("The enclosure material. One of: 'Powder Coated Mild Steel', 'Powder 316 Stainless Steel', '316 Stainless Steel Natural Finish', 'Aluminium', 'Marine Grade Aluminium'. Cubic enclosures always use 'Mild Steel'."),
      ipRating: z.string().optional().describe("IP protection rating e.g. 'IP42', 'IP54', 'IP65'. Always include if known from the drawing or if location is Outdoor."),
      currentRating: z.string().optional(),
      faultRating: z.string().optional(),
      enclosureType: z.string().optional().describe("'Custom' or 'Cubic'. This is the enclosure construction type, not the material."),
      enclosureDepth: z.string().optional(),
      tierCount: z.number().optional(),
      ctMetering: z.string().optional().describe("'Yes' or 'No'"),
      ctAssemblies: z.array(z.object({
        rating: z.string(),
        quantity: z.number()
      })).optional(),
      meterPanel: z.string().optional().describe("'Yes' or 'No'"),
      baseRequired: z.string().optional().describe("'Yes' or 'No'"),
      cableZones: z.string().optional(),
      cableZoneCount: z.number().optional(),
      includesAcbs: z.string().optional()
    },
    async (args) => {
      const { quoteId, name, type, ...configArgs } = args;
      
      const config: any = {};
      for (const [key, value] of Object.entries(configArgs)) {
        if (value !== undefined) {
          config[key] = value;
        }
      }

      const finalConfig = Object.keys(config).length > 0 ? config : undefined;

      const result = await createBoard({
        quoteId,
        name,
        type,
        config: finalConfig
      });
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
  );

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  await server.connect(transport);

  await transport.handleRequest(req, res);
}
