"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"

interface Item {
  term?: string
  text: string
}

interface Stat {
  value: string
  label: string
}

export function RulesHelpButton() {
  const t = useTranslations("rules")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = ""
    }
  }, [open])

  const stats = t.raw("stats") as Stat[]
  const section1Items = t.raw("section1.items") as Item[]
  const section2Items = t.raw("section2.items") as Item[]
  const tableHeaders = t.raw("section2.table.headers") as string[]
  const tableRows = t.raw("section2.table.rows") as string[][]
  const stage1Items = t.raw("section3.stage1.items") as string[]
  const stage2Items = t.raw("section3.stage2.items") as string[]
  const section4Items = t.raw("section4.items") as Item[]

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("buttonLabel")}
        className="fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full bg-yellow-400 hover:bg-yellow-300 text-black text-xl font-bold shadow-lg shadow-black/50 flex items-center justify-center transition-colors"
      >
        ?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-neutral-950 border-b border-neutral-800 px-5 py-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-yellow-400">{t("title")}</h2>
                <p className="text-sm text-neutral-400 mt-0.5">{t("subtitle")}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-neutral-500 hover:text-white transition-colors text-xl leading-none px-1"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-5 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {stats.map((s, i) => (
                  <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2.5 text-center">
                    <p className="text-lg font-bold text-white">{s.value}</p>
                    <p className="text-[10px] uppercase tracking-wide text-neutral-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              <Section title={t("section1.title")}>
                <ItemList items={section1Items} />
              </Section>

              <Section title={t("section2.title")}>
                <ItemList items={section2Items} />
                <div className="overflow-x-auto mt-3">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-neutral-900 text-neutral-400 text-left">
                        {tableHeaders.map((h, i) => (
                          <th key={i} className="px-3 py-2 font-medium border-b border-neutral-800">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row, i) => (
                        <tr key={i} className="border-b border-neutral-800/50">
                          {row.map((cell, j) => (
                            <td key={j} className={`px-3 py-2 ${j === 0 ? "font-medium text-white" : "text-neutral-300"}`}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 bg-yellow-400/10 border border-yellow-700/40 rounded-lg px-4 py-3">
                  <p className="text-sm font-semibold text-yellow-400 mb-1">{t("section2.callout.title")}</p>
                  <p className="text-sm text-neutral-300">{t("section2.callout.text")}</p>
                </div>
              </Section>

              <Section title={t("section3.title")}>
                <p className="text-sm text-neutral-300 mb-2">{t("section3.intro")}</p>
                <p className="text-sm font-semibold text-white mb-1.5">{t("section3.stage1.title")}</p>
                <BulletList items={stage1Items} />
                <p className="text-sm font-semibold text-white mt-4 mb-1.5">{t("section3.stage2.title")}</p>
                <BulletList items={stage2Items} />
                <p className="text-sm text-neutral-400 mt-2">{t("section3.stage2.note")}</p>
              </Section>

              <Section title={t("section4.title")}>
                <ItemList items={section4Items} />
              </Section>

              <p className="text-center text-xs text-neutral-600 pt-2 border-t border-neutral-800">
                {t("footer")}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-yellow-400 mb-2">{title}</h3>
      {children}
    </div>
  )
}

function ItemList({ items }: { items: Item[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-neutral-300 flex gap-1.5">
          <span className="text-neutral-600 shrink-0">•</span>
          <span>
            {item.term && <span className="font-medium text-white">{item.term} </span>}
            {item.text}
          </span>
        </li>
      ))}
    </ul>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-neutral-300 flex gap-1.5">
          <span className="text-neutral-600 shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
