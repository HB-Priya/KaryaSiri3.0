export default function LogoMark({ size = 40 }) {
  return (
    <span className="logo-mark" aria-hidden="true">
      <img src="/logo.png" alt="" width={size} height={size} />
    </span>
  );
}
