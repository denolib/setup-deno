# setup-deno-action

<p align="left">
  <a href="https://github.com/denolib/setup-deno-action"><img alt="GitHub Actions status" src="https://github.com/denolib/setup-deno-action/workflows/Main%20workflow/badge.svg"></a>
</p>

This action sets up deno environment for use in actions by:

- optionally downloading and caching a version of deno - versioned and add to PATH

# Usage

See [action.yml](action.yml)

Basic:
```yaml
steps:
- uses: actions/checkout@master
- uses: denolib/setup-deno-action@v1
  with:
    deno-version: 'v0.18.0'
- run: deno https://deno.land/welcome.ts
```

Matrix Testing:
```yaml
jobs:
  build:
    runs-on: ubuntu-16.04
    strategy:
      matrix:
        deno: [ 'v0.18.0', 'v0.17.0' ]
    name: Deno ${{ matrix.deno }} sample
    steps:
      - uses: actions/checkout@master
      - name: Setup deno
        uses: denolib/setup-deno-action@v1
        with:
          deno-version: ${{ matrix.deno }}
      - run: deno https://deno.land/welcome.ts
```

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)

# Contributions

Contributions are welcome!  See [Contributor's Guide](docs/contributors.md)
