import { NavBar } from "@/components/nav-bar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      {children}
    </>
  );
}
