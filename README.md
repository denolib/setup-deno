# setup-deno

[![GitHub Actions status](https://github.com/denolib/setup-deno/workflows/ci/badge.svg?branch=master)](https://github.com/denolib/setup-deno/actions)

This action sets up deno environment for use in actions by:

- optionally downloading and caching a version of deno - versioned and add to
  PATH
- registering problem matchers for error output

# Usage

See [action.yml](action.yml)

> `denolib/setup-deno@v1.1.0` has been deprecated. It may got fail in the future
> . Use `denolib/setup-deno@master` instead.

Basic:

```yaml
steps:
  - uses: actions/checkout@master
  - uses: denolib/setup-deno@master
    with:
      deno-version: 0.x
  - run: deno run https://deno.land/std/examples/welcome.ts
```

Matrix Testing:

```yaml
jobs:
  build:
    runs-on: ubuntu-16.04
    strategy:
      matrix:
        deno: [0.24.0, 0.23.0]
    name: Deno ${{ matrix.deno }} sample
    steps:
      - uses: actions/checkout@master
      - name: Setup Deno
        uses: denolib/setup-deno@master
        with:
          deno-version: ${{ matrix.deno }}
      - run: deno run https://deno.land/std/examples/welcome.ts
```

# License

The scripts and documentation in this project are released under the
[MIT License](LICENSE)

# Contributions

Contributions are welcome! See [Contributor's Guide](docs/contributors.md)
