type Primitive = null | undefined | string | number | boolean | symbol | bigint;

type LiteralUnion<LiteralType extends BaseType, BaseType extends Primitive> =
  | LiteralType
  | (BaseType & { _?: never });

export type PlatformOld = "win" | "osx" | "linux";

export type Platform =
  | "pc-windows-msvc"
  | "unknown-linux-gnu"
  | "apple-darwin"
  | PlatformOld;

export type ArchOld = "x64";

export type Arch = "x86_64" | ArchOld;

export type Version = LiteralUnion<"nightly", string>;
