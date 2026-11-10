import Image from "next/image";

// Logo de Focus Power Fit (ícono y nombre en una sola imagen, para fondo
// oscuro). «alto» fija la altura en píxeles; con «className» la define el CSS
// de la página, por ejemplo para achicarlo en celular.
export default function LogoFocus({
  alto = 44,
  className,
}: {
  alto?: number;
  className?: string;
}) {
  return (
    <Image
      src="/logo-focus-power-fit.webp"
      alt="Focus Power Fit"
      width={541}
      height={120}
      unoptimized
      priority
      className={className}
      style={className ? undefined : { height: alto, width: "auto", display: "block" }}
    />
  );
}
