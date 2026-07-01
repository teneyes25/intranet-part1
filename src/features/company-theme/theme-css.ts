export function companyThemeCss(theme: {
  colors: {
    primary: string;
    primaryForeground: string;
    accent: string;
    background: string;
    foreground: string;
    sidebar: string;
    sidebarForeground: string;
  };
}): string {
  const c = theme.colors;
  return `
    :root {
      --primary: ${c.primary};
      --primary-foreground: ${c.primaryForeground};
      --accent: ${c.accent};
      --background: ${c.background};
      --foreground: ${c.foreground};
      --sidebar: ${c.sidebar};
      --sidebar-foreground: ${c.sidebarForeground};
      --ring: ${c.primary};
    }
  `;
}
