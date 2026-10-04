"use client";

import Link from "next/link";

import { useI18n } from "@/lib/i18n/client";

export default function NotFound() {
  const { t, path } = useI18n();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5 px-4 pt-16 sm:px-6">
      <h1 className="text-display font-extrabold">{t.notFound.title}</h1>
      <p className="text-xl text-ink-2">{t.notFound.body}</p>
      <Link href={path("/")} className="text-xl font-bold">
        {t.notFound.link}
      </Link>
    </div>
  );
}
