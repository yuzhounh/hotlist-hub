export function ThemeInitScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var k='rebanghui-theme',t=localStorage.getItem(k);if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`,
      }}
    />
  );
}
