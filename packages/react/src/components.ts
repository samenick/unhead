import type { ReactNode } from 'react'
import type { ActiveHeadEntry, ResolvableHead as UseHeadInput } from 'unhead/types'
import React, { useCallback, useEffect, useMemo, useRef } from 'react'
import { HasElementTags, TagsWithInnerContent, ValidHeadTags } from 'unhead/utils'
import { useUnhead } from './composables'

interface HeadProps {
  children: ReactNode
  titleTemplate?: string
}

const Head: React.FC<HeadProps> = ({ children, titleTemplate }) => {
  const head = useUnhead()

  // Process children only when they change
  const processedElements = useMemo(() =>
    React.Children.toArray(children).filter(React.isValidElement), [children])

  const getHeadChanges = useCallback(() => {
    const input: UseHeadInput = {
      titleTemplate,
    }

    for (const element of processedElements) {
      const reactElement = element as React.ReactElement
      const { type, props } = reactElement
      const tagName = String(type)

      if (!ValidHeadTags.has(tagName)) {
        continue
      }

      const data: Record<string, any> = { ...(typeof props === 'object' ? props : {}) }

      if (TagsWithInnerContent.has(tagName) && data.children) {
        const contentKey = tagName === 'script' ? 'innerHTML' : 'textContent'
        data[contentKey] = Array.isArray(data.children)
          ? data.children.map(String).join('')
          : String(data.children)
      }
      delete data.children
      if (HasElementTags.has(tagName)) {
        const key = tagName as keyof UseHeadInput
        if (!Array.isArray(input[key])) {
          // @ts-expect-error untyped
          input[key] = []
        }
        (input[key] as any[])!.push(data)
      }
      else {
        // For singleton tags (title, base, etc.)
        // @ts-expect-error untyped
        input[tagName as keyof UseHeadInput] = data
      }
    }

    return input
  }, [processedElements, titleTemplate])

  const headRef = useRef<ActiveHeadEntry<any> | null>(
    head.push(getHeadChanges()),
  )

  useEffect(() => {
    return () => {
      if (headRef.current?.dispose) {
        headRef.current.dispose()
      }
      headRef.current = null
    }
  }, [])

  useEffect(() => {
    headRef.current?.patch(getHeadChanges())
  }, [getHeadChanges])

  return null
}

export { Head }
