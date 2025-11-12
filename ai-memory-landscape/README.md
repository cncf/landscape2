# AI Memory Landscape

A comprehensive landscape of the AI agent memory ecosystem, showcasing projects, products, and companies building memory systems for AI agents.

## Overview

This landscape organizes 30+ key technologies across 7 major categories:

- **Memory Layer Platforms**: Dedicated services providing memory-as-a-service (Mem0, Zep, Supermemory, Letta, Memori)
- **Vector Databases**: Storage systems optimized for semantic similarity search (Pinecone, Weaviate, Qdrant, Milvus, Chroma, pgvector, Redis)
- **Agent Frameworks**: Tools for building and orchestrating AI agents (LangChain, LlamaIndex, LangGraph, CrewAI)
- **Knowledge Graph Systems**: Graph-based approaches to structured knowledge (Neo4j, FalkorDB, Graphiti)
- **Foundation Model Memory**: Built-in memory features from LLM providers (ChatGPT, Claude, Gemini, AWS AgentCore)
- **RAG & Semantic Search**: Technologies for retrieval-augmented generation (Haystack, txtai, Semantic Kernel)
- **Development Tools**: Visual and workflow tools for building memory-enabled apps (Flowise, Langflow)

## What is AI Agent Memory?

AI agent memory refers to systems that allow AI agents to:
- Remember user preferences and context across interactions
- Learn and adapt based on historical data
- Maintain long-term knowledge about users, tasks, and domains
- Access relevant information from large knowledge bases
- Build temporal understanding of how information changes over time

Memory transforms AI from stateless tools into persistent, context-aware agents.

## Building Locally

### Prerequisites

- [landscape2 CLI tool](https://github.com/cncf/landscape2#installation)
- Optional: GitHub tokens for collecting repository data
- Optional: Crunchbase API key for company data

### Build Instructions

```bash
# Navigate to the landscape directory
cd ai-memory-landscape

# Build the landscape
landscape2 build \
  --data-file data.yml \
  --settings-file settings.yml \
  --guide-file guide.yml \
  --logos-path logos \
  --output-dir build

# Serve locally
landscape2 serve --landscape-dir build
```

The landscape will be available at http://127.0.0.1:8000

### With External Data Collection

To collect additional data from GitHub and Crunchbase:

```bash
# Set environment variables
export GITHUB_TOKENS="token1,token2,token3"
export CRUNCHBASE_API_KEY="your-api-key"

# Build with data collection
landscape2 build \
  --data-file data.yml \
  --settings-file settings.yml \
  --guide-file guide.yml \
  --logos-path logos \
  --output-dir build
```

## Automated Deployment

This landscape uses GitHub Actions to automatically build and deploy to GitHub Pages.

### Workflow

The `.github/workflows/build-ai-memory.yml` workflow:

1. **Triggers** on:
   - Push to main branch or development branches
   - Manual workflow dispatch
   - Changes to `ai-memory-landscape/**` files

2. **Build Process**:
   - Uses the official landscape2 container image
   - Builds the static site from YAML configuration
   - Creates 404.html for SPA routing

3. **Deploy Process**:
   - Commits build output to the `build` branch
   - Deploys to GitHub Pages automatically
   - Available at: `https://<username>.github.io/<repo>/`

### Setting Up GitHub Pages

To enable deployment:

1. Go to repository **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. The workflow will automatically deploy on the next push

### Required Permissions

The workflow needs these permissions (configured in workflow file):
- `contents: write` - To commit to build branch
- `pages: write` - To deploy to GitHub Pages
- `id-token: write` - For GitHub Pages deployment

## File Structure

```
ai-memory-landscape/
├── data.yml           # Landscape items and categories
├── settings.yml       # Visual configuration and groups
├── guide.yml          # Comprehensive guide content
├── logos/             # SVG logos for all projects
│   ├── mem0.svg
│   ├── zep.svg
│   └── ...
└── README.md          # This file
```

## Contributing

Contributions are welcome! To add a project or update information:

1. Fork the repository
2. Edit `data.yml` to add/update items
3. Add an SVG logo to the `logos/` directory
4. Update `guide.yml` if adding a new category
5. Submit a pull request

### Adding a New Project

To add a project to the landscape:

```yaml
- name: Project Name
  homepage_url: https://project.url
  logo: project-name.svg
  description: Brief description of what the project does
  repo_url: https://github.com/org/repo  # Optional
  license: Apache-2.0                     # Optional
  crunchbase: https://crunchbase.com/org  # Optional
  extra:
    summary_tags: "tag1, tag2, tag3"
    summary_use_case: "What problem does it solve"
```

## Resources

- [Landscape2 Documentation](https://github.com/cncf/landscape2)
- [YAML Configuration Reference](https://github.com/cncf/landscape2/tree/main/docs/config)
- [Example Landscapes](https://github.com/cncf/landscape2-sites)

## License

This landscape is open source and available under the Apache 2.0 license.

## Questions?

For questions about the AI Memory Landscape, please open an issue in this repository.

For questions about the landscape2 tool itself, see the [landscape2 repository](https://github.com/cncf/landscape2).
