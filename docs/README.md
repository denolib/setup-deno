# Deno versions (deprecation)

The `setup-deno` action can runs into rate limits when fetching `Deno` versions
from [Github API](https://api.github.com/repos/denoland/deno/tags). This is why
we use [release.json](./release.json) file.

You can generate the `release.json` file by running the following command

```js
$ node ./scripts/generate_release_file.js
```
