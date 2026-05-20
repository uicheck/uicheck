import type { MDXComponents } from 'mdx/types'

function withoutLegacyRef<T extends { ref?: unknown }>(props: T): Omit<T, 'ref'> {
  const next = { ...props }
  delete next.ref
  return next
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: (props) => <a {...withoutLegacyRef(props)} />,
    code: (props) => <code {...withoutLegacyRef(props)} />,
    pre: (props) => <pre {...withoutLegacyRef(props)} />,
    table: (props) => <table {...withoutLegacyRef(props)} />,
    ...components
  }
}
