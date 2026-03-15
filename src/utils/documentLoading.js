export function navigateToDocumentLoading(router, { to, title, description, delay = 1600 }) {
  const resolved = router.resolve(to)

  return router.push({
    name: 'document-loading',
    query: {
      next: resolved.fullPath,
      title,
      description,
      delay: String(delay),
    },
  })
}
