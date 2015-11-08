# do-wrapper
### A Node.js wrapper for the Digital Ocean v2 API

[![Build Status](https://travis-ci.org/matt-major/do-wrapper.svg?branch=master)](https://travis-ci.org/matt-major/do-wrapper)
[![Dependencies](https://david-dm.org/matt-major/do-wrapper.svg)](https://www.npmjs.com/package/do-wrapper)
[![Downloads](https://img.shields.io/npm/dm/do-wrapper.svg)](https://www.npmjs.com/package/do-wrapper)

### Install

```do-wrapper``` is available on ```npm``` and as such, can be installed through ```npm``` with ease.

To install ```do-wrapper``` and add it to your ```package.json``` file, use the following command:

```sh
$ npm install --save do-wrapper
```

### Usage

In order to use ```do-wrapper``` you will need to generate an API key on the DigitalOcean website. Once you have this, add the library to your project with the following command:

```sh
$ npm install --save do-wrapper
```

Once installed you need to instantiate a new copy of ```do-wrapper``` in your application, like so:

```js
var DigitalOcean = require('do-wrapper'),
    api = new DigitalOcean('[api_key]', [page_size]);
```
*Note: replace [api_key] and [per_page_size] with your API key and desired page size.*

You can now test that your API key is correct and that everything is working by checking for your account information:
```js
api.account(function (err, res, body) {
  console.log(body);
});
```

If you get back a response similar to the below, success!

```json
{
  "account": {
    "droplet_limit": 5,
    "email": "do-wrapper@do-wrapper.com",
    "uuid": "57e96b88ed1511e490ec1681e6b88ec1",
    "email_verified": true
  }
}
```

*Note: I've replaced my actual information with some dummy values...*

### Issues

Please raise an issue on GitHub with as much information as possible and the steps to replicate (if possible).

### License
The MIT License (MIT)

Copyright (c) 2015 Matt Major

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
