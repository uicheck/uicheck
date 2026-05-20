import type { MDXComponents } from 'mdx/types'

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: ({ ref: _ref, ...props }) => <a {...props} />,
    code: ({ ref: _ref, ...props }) => <code {...props} />,
    pre: ({ ref: _ref, ...props }) => <pre {...props} />,
    table: ({ ref: _ref, ...props }) => <table {...props} />,
    ...components
  }
}
