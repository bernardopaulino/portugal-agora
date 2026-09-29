import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 pt-16 sm:px-6">
      <h1 className="text-display font-extrabold">Esta página não existe.</h1>
      <p className="text-xl text-ink-2">
        Pode ter sido um erro no endereço. Escolha um distrito no topo da página ou veja o estado de
        todo o país.
      </p>
      <Link href="/" className="text-xl font-bold">
        Ver o estado do país
      </Link>
    </div>
  );
}
