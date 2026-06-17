"use client"

import React from "react"
import ReactMarkdown from "react-markdown"

interface MarkdownProps {
  content: string
  className?: string
}

export default function Markdown({ content, className = "" }: MarkdownProps) {
  return (
    <div className={`prose-sm max-w-none text-left break-words ${className}`}>
      <ReactMarkdown
        components={{
          p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
          li: ({ node, ...props }) => <li className="mb-0.5" {...props} />,
          h1: ({ node, ...props }) => <h1 className="text-sm font-extrabold mt-3 mb-1" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-xs font-extrabold mt-2.5 mb-1" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-xs font-bold mt-2 mb-0.5" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-extrabold text-neutral-900 dark:text-white" {...props} />,
          code: ({ node, className: codeClassName, children, ...props }) => {
            const match = /language-(\w+)/.exec(codeClassName || "")
            const isInline = !match && !String(children).includes("\n")
            return isInline ? (
              <code
                className="bg-neutral-200/70 dark:bg-neutral-800 px-1.5 py-0.5 rounded-md font-mono text-[11px] text-neutral-850 dark:text-neutral-200 border border-neutral-300/30 dark:border-neutral-700/50"
                {...props}
              >
                {children}
              </code>
            ) : (
              <code className={codeClassName} {...props}>
                {children}
              </code>
            )
          },
          pre: ({ node, ...props }) => (
            <pre
              className="bg-neutral-900 text-neutral-100 p-3 rounded-xl my-2.5 overflow-x-auto font-mono text-[10.5px] leading-relaxed border border-neutral-800 shadow-inner"
              {...props}
            />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-3 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <table className="w-full text-[11px] border-collapse text-left" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-800 font-bold" {...props} />,
          tbody: ({ node, ...props }) => <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800" {...props} />,
          tr: ({ node, ...props }) => <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 transition-colors" {...props} />,
          th: ({ node, ...props }) => <th className="p-2 font-bold" {...props} />,
          td: ({ node, ...props }) => <td className="p-2" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-indigo-500 pl-3 italic my-2 text-neutral-500 dark:text-neutral-400" {...props} />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
