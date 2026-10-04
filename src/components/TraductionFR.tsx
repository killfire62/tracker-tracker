"use client"

// Applique la traduction française (src/i18n/fr.ts) à l'affichage, sans modifier les composants d'origine.
// Ne change que le texte des nœuds (jamais la structure), donc compatible avec React.
import { useEffect } from "react"
import { exact, motifs } from "@/i18n/fr"

const ATTRIBUTS = ["placeholder", "title", "aria-label"] as const
const IGNORES = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA", "INPUT", "SELECT", "OPTION", "NOSCRIPT"])

function traduire(texte: string): string | null {
  const t = texte.trim()
  if (!t || t.length > 300) return null
  const direct = exact[t]
  if (direct !== undefined) return direct === t ? null : texte.replace(t, direct)
  for (const [re, rempl] of motifs) {
    if (re.test(t)) return texte.replace(t, t.replace(re, rempl))
  }
  return null
}

function ignore(el: Element | null): boolean {
  for (let e = el; e; e = e.parentElement) {
    if (IGNORES.has(e.tagName) || e.hasAttribute("data-no-translate") || (e as HTMLElement).isContentEditable) return true
  }
  return false
}

function traiterTexte(n: Text) {
  if (ignore(n.parentElement)) return
  const v = n.nodeValue
  if (!v) return
  const tr = traduire(v)
  if (tr !== null && tr !== v) n.nodeValue = tr
}

function traiterElement(el: Element) {
  if (ignore(el)) return
  for (const a of ATTRIBUTS) {
    const v = el.getAttribute(a)
    if (v) {
      const tr = traduire(v)
      if (tr !== null && tr !== v) el.setAttribute(a, tr)
    }
  }
}

function parcourir(racine: Node) {
  if (racine.nodeType === Node.TEXT_NODE) return traiterTexte(racine as Text)
  if (racine.nodeType !== Node.ELEMENT_NODE) return
  traiterElement(racine as Element)
  const w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) traiterTexte(n as Text)
    else traiterElement(n as Element)
  }
}

export function TraductionFR() {
  useEffect(() => {
    document.documentElement.lang = "fr"
    parcourir(document.body)
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "characterData") traiterTexte(m.target as Text)
        else if (m.type === "attributes") traiterElement(m.target as Element)
        else m.addedNodes.forEach(parcourir)
      }
    })
    obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRIBUTS] })
    return () => obs.disconnect()
  }, [])
  return null
}
