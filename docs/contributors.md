# Contributors

### Checkin

- Do checkin source (src)
- Do checkin a single index.js file after running `ncc`
- Do checkin runtime node_modules

### NCC

In order to avoid uploading `node_modules` to the repository, we use
[zeit/ncc](https://github.com/zeit/ncc) to create a single `index.js` file that
gets saved in `dist/`.

### Developing

If you're developing locally you can run

```
npm i
tsc
ncc build
```

An files generated using `tsc` will be added to `lib/` however those files also
are not uploaded to the repository and are exluded using `.gitignore`.

During the commit step, Husky will take care of formatting all files with
[Prettier](https://github.com/prettier/prettier)

### Testing

We ask that you include a link to a succesfull run that utilizes the changes you
are working on. For example, if your changes are in the branch
`newAwesomeFeature`, then show an example run that uses
`setup-python@newAwesomeFeature`. This will help speed up testing and help us
confirm that there are no breaking changes or bugs.
