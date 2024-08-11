# Data Tokens

Data Tokens is a Cardano minting policy designed to extend the capacity
of data embedded in tokens. Typically, Cardano tokens allow embedding
only 32 bytes of data into a token via the token name. However, this
project enables minting policies to embed an additional byte of data by
creating multiple policy IDs. Each policy ID represents an additional
byte of data, allowing for a total of 33 bytes to be embedded into a
token. These minted tokens can essentially act as wallet metadata that
third parties can query for information from the holding wallet.

## Prerequisites

To use this project, ensure you have the following installed:

  - **Node.js** (v18.8 or later)
  - **npm** (Node Package Manager)
  - **aiken** (v1.0.29-alpha or later)

## Data Tokens CLI

Data Tokens CLI is a command-line interface (CLI) helper for managing
data tokens. This tool allows you to deploy minting policies, mint new
data tokens, and burn existing ones.

### Installation

To install the necessary dependencies, run:

``` bash
npm install
```

### Usage

The CLI (`npx tokens`) provides several commands to manage data tokens.

#### deploy

Deploy minting policies for data tokens.

``` bash
npx tokens deploy [options] <address> <prefixes...>
```

  - **address**: The address of the wallet deploying the minting
    policies.
  - **prefixes**: One or more prefixes of the extra one-byte data to
    embed into the tokens. For example, `aa bb cc` etc.

#### mint

Mint a new data token.

``` bash
npx tokens mint [options] <address> <hash> <data> <prefixes...>
```

  - **address**: The address of the wallet that will mint the token.
  - **hash**: The transaction ID resulted from the `deploy` command.
  - **data**: The 33-byte data to be included in the token.
  - **prefixes**: The list of prefixes that were passed into the
    `deploy` command.

#### burn

Burn all data tokens in a wallet.

``` bash
npx tokens burn [options] <address> <hash> <prefixes...>
```

  - **address**: The address from which the tokens will be burned.
  - **hash**: The transaction ID resulted from the `deploy` command.
  - **prefixes**: The list of prefixes that were passed into the
    `deploy` command.

## License

This project is licensed under the GNU Lesser General Public License
(LGPL). By using or contributing to this project, you agree to the terms
and conditions of LGPL.

## Support

If you encounter any issues or have questions, feel free to reach out
for support.

Happy minting and burning\!
