import type { MDXComponents } from 'mdx/types'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: (props) => <a {...props} />,
    code: (props) => <code {...props} />,
    pre: (props) => <pre {...props} />,
    table: (props) => <table {...props} />,
    ...components
  }
}
