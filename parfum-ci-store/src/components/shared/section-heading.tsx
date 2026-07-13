import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
};

export function SectionHeading({ eyebrow, title, description, className }: SectionHeadingProps) {
  return (
    <div className={cn("max-w-3xl", className)}>
      {eyebrow ? (
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-4xl font-semibold leading-tight text-foreground md:text-5xl">{title}</h1>
      {description ? (
        <p className="mt-4 text-base leading-7 text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
