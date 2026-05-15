import nextra from 'nextra'

const withNextra = nextra({})

const nextConfig = {
  output: 'export',
  outputFileTracingRoot: process.cwd(),
  trailingSlash: true
}

export default withNextra(nextConfig)
