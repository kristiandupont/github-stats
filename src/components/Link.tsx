import type { Children, Context } from "@b9g/crank";

function Link(
  this: Context,
  { href, children }: { href: string; children: Children }
) {
  const onclick = (e: MouseEvent) => {
    e.preventDefault();
    window.location.hash = href;
    this.refresh();
  };

  return (
    <a href={`#${href}`} onclick={onclick}>
      {children}
    </a>
  );
}

export default Link;
