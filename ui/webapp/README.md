# UI development

The SolidJS web application is located in this directory. Install its dependencies
and start the Vite development server from the repository root:

```text
yarn --cwd ui/webapp install
yarn --cwd ui/webapp dev
```

By default, the development server loads datasets and generated assets from
`ui/webapp/static`. To develop against data from an existing landscape, copy the
example environment file and configure the landscape URL:

```text
cp ui/webapp/.env.local.example ui/webapp/.env.local
```

```text
VITE_PROXY_TARGET=https://landscape.cncf.io
```

Restart the development server after changing `.env.local`. The proxy handles
datasets, documents, images, and logos during development only; production
builds are not affected. Remove `VITE_PROXY_TARGET` to use the local generated
assets again.
