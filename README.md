# setup-deno

[![GitHub Actions status](https://github.com/denolib/setup-deno/workflows/ci/badge.svg?branch=master)](https://github.com/denolib/setup-deno/actions)

This action sets up deno environment for use in actions by:

- optionally downloading and caching a version of deno - versioned and add to
  PATH
- registering problem matchers for error output

# Usage

See [action.yml](action.yml)

Basic:

```yaml
steps:
  - uses: actions/checkout@v2
  - uses: denolib/setup-deno@v2
    with:
      deno-version: v1.x
  - run: |
    deno --version
    deno run https://deno.land/std/examples/welcome.ts
```

Matrix Testing:

```yaml
jobs:
  build:
    runs-on: ubuntu-16.04
    strategy:
      matrix:
        deno: ["v1.0.0", "v0.42.0", "v1.x", "v0.x"]
    name: Deno ${{ matrix.deno }} sample
    steps:
      - uses: actions/checkout@v2
      - name: Setup Deno
        uses: denolib/setup-deno@v2
        with:
          deno-version: ${{ matrix.deno }}
      - run: |
        deno --version
        deno run https://deno.land/std/examples/welcome.ts
```

Nightly Testing:

```yaml
steps:
  - uses: actions/checkout@v2
  - uses: denolib/setup-deno@v2
    with:
      deno-version: nightly
  - run: |
    deno-nightly --version
    deno-nightly run https://deno.land/std/examples/welcome.ts
```

# License

The scripts and documentation in this project are released under the
[MIT License](LICENSE)

# Contributions

Contributions are welcome! See [Contributor's Guide](docs/contributors.md)
