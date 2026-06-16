import LinkComponent from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, type ReactNode } from "react";

export function BrowserRouter({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function Routes({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function Route({ element }: { element: ReactNode }) {
  return <>{element}</>;
}

export function Link({
  to,
  children,
  ...props
}: {
  to: string;
              children: ReactNode;
  [key: string]: any;
}) {
  return (
    <LinkComponent href={to} {...props}>
      {children}
    </LinkComponent>
  );
}

export function Navigate({ to, replace = false }: { to: string; replace?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (replace) router.replace(to);
    else router.push(to);
  }, [replace, router, to]);
  return null;
}

export function useNavigate() {
  const router = useRouter();
  return (to: string) => router.push(to);
}

export function useLocation() {
  const router = useRouter();
  const pathname = router.asPath.split("?")[0];
  const search = router.asPath.includes("?") ? "?" + router.asPath.split("?")[1] : "";
  return { pathname, search };
}

export function useSearchParams(): [URLSearchParams] {
  const router = useRouter();
  const params = useMemo(() => {
    const query = router.asPath.split("?")[1] || "";
    return new URLSearchParams(query);
  }, [router.asPath]);
  return [params];
}
