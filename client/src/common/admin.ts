// Shared helpers for the admin pages.

export const escapeHtml = (s: string): string =>
    s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export const breadcrumb = (items: { label: string; href?: string }[]): string =>
    `<nav class="ed-breadcrumb">${items.map((it, i) => {
        const last = i === items.length - 1;
        const content = it.href && !last
            ? `<a href="${it.href}">${escapeHtml(it.label)}</a>`
            : `<span>${escapeHtml(it.label)}</span>`;
        return content + (last ? "" : `<span class="ed-breadcrumb-sep">›</span>`);
    }).join("")}</nav>`;
