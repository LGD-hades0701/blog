---
keywords:
  - Nix
---

# HERP における Nix 活用

[HERP](https://herp.co.jp/) における開発では Nix が広く活用されている．Nix は非常に便利な代物なのだが，ドキュメントの貧弱さ，急峻な学習曲線，企業における採用事例の乏しさなどが相まって，広く普及しているとは言い難く，ましてや国内企業での採用事例を耳にする機会はほとんどない．しかし，Nix の利便性は，複数人での開発においてこそ，その本領が発揮されると考えている．この記事は，HERP における活用事例の紹介を通じて，Nix の利便性ならびに企業での活用可能性について紹介することを目的としている．

---

## Nix とは

[Nix](https://nixos.org/) は "the purely functional package manager" と銘打たれたパケッジマネジャーである．GNU Linux および macOS 上で利用できる．

## ビルド

Nix は the purely functional "package manager" なので，当然ながらパケッジを作成する機能を有している．といっても，Nix はパケッジとしての配布を念頭に置いたものだけではなく，あらゆる種類のファイル[^1]をビルドできる汎用的な仕組みになっている．そのため，ここではビルドによって得られるものを単に「成果物」と呼ぶことにする．

Nix によるビルドの手順を記述したものは derivation と呼ばれる．以下は [The One True Awk](https://github.com/onetrueawk/awk) をビルドするための derivation の例である．

```plaintext
Derive([("out","/nix/store/79002wja1z289imdsgqwkgagykjfxzxh-nawk-unstable-2021-02-15","","")],[("/nix/store/3jnv612pkja4zf6kqk8wh21r7qv1l8wx-stdenv-darwin.drv",["out"]),("/nix/store/bdxysy0iphwjfabbgp8hm7iihxhzl8y4-bison-3.8.2.drv",["out"]),("/nix/store/d6a1lcpqxyjik3yaqid2lqhpdypc59kf-clang-wrapper-11.1.0.drv",["out"]),("/nix/store/hfh0875gb5h6g36ksh16xsykdgmh1xzl-bash-5.1-p16.drv",["out"]),("/nix/store/zgkrhllll11pxqlbckxb9dzzbafylv31-source.drv",["out"])],["/nix/store/9krlzvny65gdc8s7kpb6lkx8cd02c25b-default-builder.sh"],"aarch64-darwin","/nix/store/b79bk75lhp67hyjphzrakwrp2p9k37iv-bash-5.1-p16/bin/bash",["-e","/nix/store/9krlzvny65gdc8s7kpb6lkx8cd02c25b-default-builder.sh"],[("__darwinAllowLocalNetworking",""),("__impureHostDeps","/bin/sh /usr/lib/libSystem.B.dylib /usr/lib/system/libunc.dylib /dev/zero /dev/random /dev/urandom /bin/sh"),("__propagatedImpureHostDeps",""),("__propagatedSandboxProfile",""),("__sandboxProfile",""),("buildInputs",""),("builder","/nix/store/b79bk75lhp67hyjphzrakwrp2p9k37iv-bash-5.1-p16/bin/bash"),("configureFlags",""),("depsBuildBuild","/nix/store/p6jps5bxg47rk4jj63vkw7vv67082zkw-clang-wrapper-11.1.0"),("depsBuildBuildPropagated",""),("depsBuildTarget",""),("depsBuildTargetPropagated",""),("depsHostHost",""),("depsHostHostPropagated",""),("depsTargetTarget",""),("depsTargetTargetPropagated",""),("doCheck",""),("doInstallCheck",""),("installPhase","runHook preInstall\ninstall -Dm755 a.out \"$out/bin/nawk\"\ninstall -Dm644 awk.1 \"$out/share/man/man1/nawk.1\"\nrunHook postInstall\n"),("makeFlags","CC=cc HOSTCC=clang"),("name","nawk-unstable-2021-02-15"),("nativeBuildInputs","/nix/store/mm2bai6q9k1rxzyvlffa3wvlwrhlmdlj-bison-3.8.2"),("out","/nix/store/79002wja1z289imdsgqwkgagykjfxzxh-nawk-unstable-2021-02-15"),("outputs","out"),("patches",""),("pname","nawk"),("propagatedBuildInputs",""),("propagatedNativeBuildInputs",""),("src","/nix/store/2zpvr6nfn0rwhys1n9n5pp86idsj7460-source"),("stdenv","/nix/store/lxbpz8h8ls94jini51l4rgx1wkhkfl1b-stdenv-darwin"),("strictDeps",""),("system","aarch64-darwin"),("version","unstable-2021-02-15")])
```

とはいえ，ユーザが上記の形式を直接書き下すわけではない．Nix のユーザは， [Nix language](https://nixos.org/manual/nix/stable/language/index.html) と呼ばれる DSL を用いて，上記のような derivation を算出するための expression を記述する．この言語は動的型付けで非正格な関数型言語という特徴を持つ．上記の derivation は実際には以下のような Nix expression から算出されている[^2]．このように，derivation を算出する expression を書く際には，典型的には [`stdenv.mkDerivation`](https://nixos.org/manual/nixpkgs/stable/#sec-using-stdenv) 関数を利用することになる．

```nix
{ lib, stdenv, fetchFromGitHub, bison, buildPackages }:

stdenv.mkDerivation rec {
  pname = "nawk";
  version = "unstable-2021-02-15";

  src = fetchFromGitHub {
    owner = "onetrueawk";
    repo = "awk";
    rev = "c0f4e97e4561ff42544e92512bbaf3d7d1f6a671";
    sha256 = "kQCvItpSJnDJMDvlB8ruY+i0KdjmAphRDqCKw8f0m/8=";
  };

  depsBuildBuild = [ buildPackages.stdenv.cc ];
  nativeBuildInputs = [ bison ];
  makeFlags = [
    "CC=${stdenv.cc.targetPrefix}cc"
    "HOSTCC=${if stdenv.buildPlatform.isDarwin then "clang" else "cc"}"
  ];

  installPhase = ''
    runHook preInstall
    install -Dm755 a.out "$out/bin/nawk"
    install -Dm644 awk.1 "$out/share/man/man1/nawk.1"
    runHook postInstall
  '';

  # omitted for brevity
}
```

一般論として，ソフトウェアはほとんどの場合，他のソフトウェアに依存している．例えば，C++ で書かれたソフトウェアをビルドするためには GCC や Clang などのコンパイラが必要になる．また，TypeScript で書かれたアプリケーションビルドするためには TypeScript のコンパイラのみならず，そのアプリケーションを実行する段階では Node.js や Deno といったランタイムが必要になる．

Nix は数多のソフトウェアの間に潜むこのような依存関係を陽に取り扱うという特徴を持つ．ビルド時に必要な依存を明示的に指定するのはもちろんのこと，実行時に参照されるランタイムや動的ライブラリのパスも，Nix によって解決されインストールされたものに固定される[^3]．

あらゆる種類のファイルをビルドできるという性質上，実に様々なものが成果物になり得るが，社内では例として以下のようなものを Nix を用いてビルドしている．

### npm package の tarball

最も単純な例としては，`$ npm publish` の対象となる tarball を Nix でビルドできるようにしている．

ビルドに際しては大抵 Node.js が必要になるが，先に述べた通り，Nix ではこのような依存は陽に取り扱われる必要がある．`stdenv.mkDerivation` 関数の引数となる [attribute set](https://nixos.org/manual/nix/stable/language/values.html#attribute-set) に [`buildInputs`](https://nixos.org/manual/nixpkgs/stable/#var-stdenv-buildInputs) attribute を指定することで，このような依存を宣言する．

```nix filename=default.nix
{ pkgs ? import <nixpkgs> {} }:

pkgs.stdenv.mkDerivation {
  buildInputs = [
    pkgs.nodejs # ビルド時に必要な依存を明示的に指定する
  ];

  buildPhase = ''
    # node コマンドが利用できる
    node --version

    # ...
  '';
}
```

些末な点だが，自前でビルドスクリプトを書く場合とは異なり，Nix がソースコードを一時ディレクトリに自動的にコピーしてくれるので，カレントディレクトリを汚さない点が嬉しい．

### アプリケーション

手元の環境で開発を行ったアプリケーションを実際に顧客に提供するためには，まずリポジトリ内のソースコードを「ビルド」と呼ばれる成果物に変換する必要がある[^4]．このような変換は，ほとんどの場合 Nix を利用して行われている．

既に述べたように，Nix を用いてアプリケーションをビルドすれば，ビルド時に必要になる依存を Nix 経由で調達することができる[^5]．[以前の記事](https://blog.ryota-ka.me/posts/2021/02/11/nix-puppeteer-fontconfig)では，Nix を利用して `stories.json` というファイルを含んだ Storybook をビルドする事例を紹介した．このケースではビルドにあたって Puppeteer を利用するため Chromium が必要であり，正面から取り組むとセットアップがいささか面倒だが，Nix を利用することでビルド時に必要になる依存を簡単に解決することができる．

https://blog.ryota-ka.me/posts/2021/02/11/nix-puppeteer-fontconfig

また，Haskell 製のアプリケーションについては [haskell.nix](https://input-output-hk.github.io/haskell.nix/) が社内の多くのリポジトリで活用されている．これは，[IOHK](https://iohk.io/) によって OSS として公開されている，Nix を用いて Haskell 製アプリケーションをビルドするためのビルド基盤である．Cabal のコンポーネント単位で derivation が生成されるため，ビルドされたバイナリもこの単位でキャッシュされる．次節で述べる Docker image のビルドの際にもこのキャッシュを利用できるため，ビルド時間の削減に大きく貢献している．

### Docker image

HERP におけるアプリケーションは， すべて Kubernetes クラスタにデプロイされる[^6]ため，アプリケーション開発の成果物として Docker image を作成する必要がある．いくつかのリポジトリでは`Dockerfile` を書く代わりに，[`pkgs.dockerTools`](https://nixos.org/manual/nixpkgs/stable/#sec-pkgs-dockerTools) を利用して Docker image をビルドするための Nix expression を記述している．記述する expression は概ね以下のような形になる．

```nix
{ tag }:

let
  pkgs = import ./nix/pkgs.nix {};
  app = import ./default.nix; # 前節で作成したアプリケーションをビルドする Nix expression
in

pkgs.dockerTools.buildLayeredImage {
  name = "mycompany/myapp";
  inherit tag;

  contents = [
    app # 作成される Docker image の /nix/store/ 以下に格納される
    pkgs.nodejs
    pkgs.tini
  ];

  config = {
    Cmd = [ "tini" "--" "node" "${app}/index.js" ];
    Env = [
      "LANG=C.UTF-8"
      "NODE_ENV=production"
    ];
  };
}
```

ここで `app` という変数は，前節で紹介したようなアプリケーションをビルドするための expression に束縛されていると想定している．`contents` に指定した derivation のビルド結果は，成果物となる Docker image の `/nix/store/` ディレクトリ以下に配置されるため，上記の expression から算出される derivation をビルドすれば，`/nix/store/` ディレクトリ以下にアプリケーションが存在する Docker image を得ることができる．このようにして，極めて宣言的かつ再利用性の高い形で，[Docker Image Specification v1.2.0](https://github.com/moby/moby/blob/master/image/spec/v1.2.md) に準拠した Docker image の構成を記述することができる．

### Kustomize の YAML

Kustomize では YAML のパッチを YAML に適用するために YAML を記述する．YAML を生成するための YAML を記述する作業には多大なる苦痛が伴うため，こうした領域でも Nix を活用することで苦痛を和らげている．`$ helm pull`, `$ helm template`, `$ kustomize build` といったコマンドをラップするヘルパー関数や，更にそれらをラップした [module](https://nixos.org/manual/nixos/stable/index.html#sec-writing-modules) がコンポーネントごとに用意されており，Nix language の記述力を活かして，デプロイ先のクラスタや，Helm に与える `values.yaml` の指定などが柔軟に行えるようになっている．

リポジトリにコミットされた Nix ファイルから，実際にクラスタに apply される YAML を生成する課程は，Argo CD の [Config Management Plugin](https://argo-cd.readthedocs.io/en/stable/user-guide/config-management-plugins/) を用意して担わせている．

## 開発環境やオペレーション環境の提供

アプリケーション開発のための環境構築は，何らビジネス上の価値を産まないにもかかわらず，避けることもできないという厄介な存在である．HERP では Nix を活用することでこうした問題に対処している．

[`nix-shell`](https://nixos.org/manual/nix/stable/command-ref/nix-shell.html) コマンドを実行すると，Nix を通じて依存が解決・インストールされ，必要なディレクトリに `$PATH` が通されたシェルが立ち上がる．これを利用して，開発や運用に必要な依存をプロジェクトのコードベース中にあらかじめ宣言しておき，そのプロジェクトの開発環境を提供することができる．

アプリケーションのリポジトリにおいては，TypeScript のプロジェクトでは Node.js や Yarn などが，Haskell のプロジェクトでは GHC や Haskell Language Server などがインストールされ，開発環境が提供される．また，主として SRE の管轄になっている，GitOps や Infrastructure as Code を実践するためのリポジトリにおいては，Argo, AWS, Helm, Istio, Kubernetes, Kustomize, Terraform といった様々な CLI がインストールされ，オペレーション環境が提供されるようになっている．

Nix を通じて開発環境やオペレーション環境を提供することには，次に挙げるような利点があると考えている．

- 言語に依存しない
- プログラムとして記述できる
- 宣言的に記述できる
- 再現性が高い
- 環境を汚さない
- 透過的に利用できる

### 言語に依存しない

例えば，プロジェクトごとに利用する Node.js のヴァージョンを切り替えたい場合，nvm, nodenv, n などの利用が選択肢として挙がってくるだろう．同様に，Python であれば pyenv，Ruby であれば rbenv や rvm などを採用する事例が多いのではないかと推察する．Nix は特定の言語に依存するものではないため，これらのいずれをも取り扱うことができる．

仮に上記のような依存だけで済むなら anyenv を導入すればいいかもしれないが，開発に必要な依存というものはプログラミング言語の処理系だけに留まらない．社内での事例を例に取ると，AWS CodeArtifact に置かれたライブラリや，Amazon ECR に置かれた Docker image を取得するための認可を行うため，AWS CLI が必要になるケースは典型的である．その前段として，そもそも AWS へのアクセス権限を得るためには [saml2aws](https://github.com/Versent/saml2aws) を利用している[^7]．リポジトリ内に置いておきたいスクリプトから jq などを利用したい場合もあるだろう．更に言えば，実行可能ファイルのみならず，時には動的ライブラリへの依存が必要になる場面もある．例えば，MySQL のCライブラリへのFFIを行うライブラリを利用する場合では，ビルド時に `mysql.h` を参照する必要がある．Nix を使えば，上に挙げたどのような依存も解決することができる．

この節の内容は，オフィシャルサイトのスクリーンキャストのうち ["Multiple languages, one tool"](https://nixos.org/#asciinema-demo-example_2) に概ね対応している．合わせて参照されたい．

### プログラムとして記述できる

環境構築の煩わしさの一因として，その手順を記したドキュメントが頻繁に参照されるものでないがゆえに，しばしば最新の状態に保たれていないという事態があるのではないかと思う．私見では，こうした環境構築の手順は，自然言語によってではなく，コードベースにコミットされるプログラムとして記述されるべきだと考えている．ドキュメントが常に最新の状態に保たれるためには絶えず検証がなされる必要があるが，こうした検証を機械的に行うことは，それ自体が実行ないし評価可能なプログラムとして記述されていないと途端に難しくなるからだ．

このようなプラクティスは Nix を使うことで実現できる．あるプロジェクトの開発に必要な依存は，そのリポジトリ内の `shell.nix` というファイルに記述し，コミットする．このファイルに記述された内容は，開発者が日頃の開発に際し `nix-shell` を立ち上げる度に検証される．もしこれが満足な開発環境を提供しなければ，そもそも開発が行えないため，必然的に修正の対象となる．このようにして，環境構築にまつわる問題が，我々が日常的に行うソフトウェアエンジニアリングの問題に還元される．

この節の内容は，オフィシャルサイトのスクリーンキャストのうち ["Declarative development environments"](https://nixos.org/#asciinema-demo-example_3) に概ね対応している．合わせて参照されたい．

### 宣言的に記述できる

プロジェクトに必要な依存は Nix language を用いて宣言的に記述する．宣言的に記述できるがゆえに，依存のインストールは自動的に冪等であり，開発者が中間状態について気に掛ける必要はない．加えて，不要になった依存を自動的に検出し，ガーベジコレクションを行うことさえできる．

### 再現性が高い

異なる開発者間で，異なるヴァージョンのソフトウェアがインストールされていることに起因して問題が生じるといった事態は，典型的ではあるが馬鹿馬鹿しいものでもある．理想的には，パッチヴァージョンはもちろんのこと，ビルド時に指定されるオプションまでもが一致した状態で開発を行うべきであろう．こうした問題は，環境構築の再現性を高めることによって解消することができる．

Nix が the "purely functional" package manager と銘打たれている理由のひとつに，あらゆる依存関係——「入力」と言い換えてもよい——を明示的に取り扱うという特徴がある．暗黙の依存が排除され，同じ入力からは常に同一のパケッジが作成されるという意味で "purely functional" である．裏を返せば，Nix は他のパケッジマネジャーと比べて，パケッジ同士の同一性を極めて厳格に区別する．同じソフトウェアの異なるヴァージョンが互いに区別されるのはもちろんのこと，同じヴァージョンのソフトウェアであっても，ビルド時に異なるオプションが指定されているならば，それらは相異なるパケッジとして扱われ，別々のディレクトリにインストールされる．

通常，パケッジマネジャーからインストールできるパケッジのリストは，日々上書きされる形で更新される．例えば Homebrew では `$ brew update`，APT では `$ apt update` の実行がそれにあたる．しかし，このような行為は，どのようなパケッジが実際にインストールされるかを非決定的にしてしまう．パケッジのリストは一種の入力に他ならず，暗黙にではなく明示的に取り扱われて然るべきものなのである．Nix ではこのようなリスト[^8]は package set と呼ばれるが，ビルドの再現性を高めるため，package set の取得元となる Git リポジトリの revision を固定することがしばしば行われる．社内では [niv](https://github.com/nmattia/niv) を利用して[^9]，依存先となる [`NixOS/nixpkgs`](https://github.com/NixOS/nixpkgs) リポジトリなどを特定の revision に固定している．

高い再現性がもたらす恩恵として，一度ビルドした成果物をキャッシュとして効率的に利用できるという点がある．完全な再現性が実現されているならば，同一の derivation からは理論上常に同一の成果物がビルドされるはずだからだ．Nix は，derivation から算出されるハッシュ値が一致する成果物が既に存在する場合，それをキャッシュとして透過的に利用する．また，このようなキャッシュをリモートから取得する機構も備えている．

こうした仕組みを通じて実現された高い再現性の恩恵に預かりつつ，開発環境の構築だけではなく，前述のように production ビルドにも同一の依存解決メカニズムを用いることは，開発環境と本番環境の差異を生じさせない[^10]ことにも貢献する．

### 環境を汚さない

Nix によってインストールされた依存はすべて `/nix/store/` 以下に格納されるため，`/usr/local/bin/` などのディレクトリを汚す心配がない．

また，`/nix/store/` 以下に作成されるファイル名には derivation から算出されたハッシュ値が付与される．前節において，同じソフトウェアであっても，パッチヴァージョンはおろか，ビルド時に与えるオプションが異なれば，それらは相異なるパケッジとして扱われると述べた．それぞれのパケッジでは derivation のハッシュ値が異なるため，これらは別々のディレクトリに保存されることになる．こうして，異なるヴァージョンを一つの環境に問題なく同居させることができる．

このような潔癖とまで言える富豪的な仕組みのおかげで，新たな依存をインストールした際にも，既存の環境を壊すといった事態は生じない．もはや dependency hell に煩わされる心配はない．

### 透過的に利用できる

Nix を用いた開発環境構築の利点を説明する際に，「Docker を利用する場合との差異は何か」と問われることがしばしばある．これに対する回答は「Nix は Docker とは異なり，コンテナ仮想化などを行うものではない」である．Nix が行う仕事は，単に依存を解決し，必要なもののビルドやインストールを行い，`$PATH` を通すことだけである．

コンテナ仮想化は便利な技術ではあるものの，それに起因する煩わしさも引き起こす．一例を挙げると，コンテナの内部からホストマシンのファイルシステムにアクセスしたい場合には，明示的にヴォリュームのマウントを行う必要がある．以下は [`amazon/aws-cli`](https://hub.docker.com/r/amazon/aws-cli) Docker image を利用して，Amazon S3 からファイルを取得する場合に実行するコマンドである．

```sh
$ docker run --rm -it -v ~/.aws:/root/.aws -v $(pwd):/aws amazon/aws-cli s3 cp s3://my-bucket/path/to/object .
```

これに対し，Nix を利用して AWS CLI を調達する場合では，コンテナ仮想化に伴う煩わしい問題は生じないため，インストールされた AWS CLI を単にそのまま利用すればよい．

```sh
$ aws s3 cp s3://my-bucket/path/to/object .
```

また，HERP における開発では，Nix と合わせて [direnv](https://direnv.net/) も全社的に利用されている．[`direnv-stdlib`](https://direnv.net/man/direnv-stdlib.1.html) に定義されている [`use nix`](https://direnv.net/man/direnv-stdlib.1.html#codeuse-nix-code) 関数を使えば，プロジェクトのディレクトリに `cd` するだけで，Nix によって解決された依存が自動的にインストールされ，当該セッションで `$PATH` が通される．開発者は `nix-shell` コマンドを実行する必要すらなく，ディレクトリを切り替えるだけで必要な開発環境が得られるのである．

## 継続的インテグレーション

社内での継続的インテグレーション (CI) には主に GitHub Actions の self-hosted runner を利用している[^11][^12]が，[Actions Runner](https://github.com/actions/runner) をそのまま利用するのではなく，ジョブの実行環境において Nix が利用できるよう，専用の Docker image を用意している[^13]．

Nix を用いてビルドした成果物は，キャッシュとして効率的に利用できるというのは既に述べた通りである．こうしたキャッシュの保存先として Amazon S3 のバケットを用意しており，[`post-build-hook`](https://nixos.org/manual/nix/stable/advanced-topics/post-build-hook.html) によって，ビルドされた成果物は自動的に S3 バケットに保存される．加えて，前述の Docker image では最初からこのバケットが substituter[^14] として設定されているため，CI を利用する各アプリケーションのリポジトリでは，何ら特別な設定をすることなく，S3 バケット上に存在するキャッシュを透過的に利用できるようになっている．

CI 上で実行するジョブが必要とする依存も，Nix を経由して入手できるという点もまた魅力的である．nixpkgs が豊富なパケッジを提供しているのはもちろんのこと，もし nixpkgs に含まれないものが必要な場合でも，Nix expression を書いてリポジトリにコミットしておくことで，それを参照することにより依存を解決できる．更に，こうした依存も `shell.nix` に記述しておけば，手元の開発環境と CI 上での環境を一致させることは容易い．

## 社内用 CLI の提供

開発に利用できる AWS アカウントや Kubernetes クラスタへのアクセス権限を，各開発者が [OAuth 2.0 Device Authorization Grant](https://www.rfc-editor.org/rfc/rfc8628) 経由で得るための CLI を用意している．この CLI は種々の環境変数を要求するため，セットアップに際して `.zshrc` に設定を書き加える必要があるが，[Home Manager](https://nix-community.github.io/home-manager/) module も合わせて提供しており，Home Manager を利用している開発者は設定を簡便に行える．

## 将来の構想

ここまでは，社内で現在既に行われている施策を紹介した．この節では，現時点では実現できていないものの，開発の更なる生産性向上のため将来的に実施したいと考えている事項について述べる．

### 開発環境へのバイナリキャッシュの提供

nixpkgs から提供されているパケッジは，[Hydra](https://hydra.nixos.org/) という CI 上で事前にビルドされ，絶えずキャッシュが作成されている．しかし，自前で書いた Nix expression ではそうもいかないので，手元の環境でビルドせざるを得ない．

だが，社内の CI 上でそれらをあらかじめビルドしておき，開発環境からそのバイナリキャッシュが利用できるようになれば，開発生産性の向上が期待できるだろう．社内の開発者は基本的に macOS 上で開発を行っているため，macOS のインスタンスで稼働する GitHub Actions 上で Darwin 向けのバイナリキャッシュを作成しておき，開発環境から利用できるようにしたいと考えている．

### 開発用端末のセットアップの簡略化

社内では現在 [Jamf Pro](https://www.jamf.com/products/jamf-pro/) を利用したモバイルデヴァイス管理 (MDM) の導入を進めている．現在のところ，開発者が端末のセットアップを行う際に，Nix をインストールする作業は自前でやってもらわざるを得ない．しかし，Jamf Pro を利用し，Nix があらかじめインストールされた状態で貸与端末を提供することができれば，時間がかかりがちな端末セットアップの迅速化を図れるのではないかという構想がある．

## 終わりに

この記事では，HERP における Nix の活用事例の紹介を通じて，その利便性ならびに企業での活用可能性について紹介した．この記事の内容を通じて，Nix 自体や，Nix を利用した開発生産性の向上に少しでも興味を持っていただけたならば幸いである．

HERP では，今後も引き続き Nix および周辺のエコシステムに対する技術的・財政的な投資をしていきたいと考えている．その一環として，今年の5月には NixOS Foundation への財政支援を行った．

https://prtimes.jp/main/html/rd/p/000000046.000030340.html

HERP では，Nix を利用してプロダクト開発の生産性を高めたり，高い生産性の下でプロダクト開発を行うことに興味があるソフトウェアエンジニアを募集している．

### コミュニティ

会社とは関係のない話だが，同僚である [@hiroqn](https://github.com/hiroqn) と共に，Nix に関する日本語での情報交換を目的として以下のコミュニティを立ち上げた．現在のところ Discord 上での情報交換を行うに留まっているが，ゆくゆくは勉強会やカンファレンスなども開催していきたいと考えている．

https://github.com/nix-ja

Discord には以下のリンクから参加できる．プロフェッショナルの方はもちろん，これから Nix に入門してみたい方も大歓迎なので，この記事を読んで少しでも Nix に興味を持ってもらえたならば是非ご参加いただきたい．

https://discord.gg/TYytzedtbe

### クレジット

記事中で使用した NixOS のロゴは [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) の下でライセンスされている．

https://github.com/NixOS/nixos-artwork/tree/master/logo

## 脚注

[^1]: ディレクトリも含む．
[^2]: [GitHub に書かれたもの](https://github.com/NixOS/nixpkgs/blob/4968a578314bf48a37021c7affc31be69c2f52fe/pkgs/tools/text/nawk/default.nix)を引用の上，一部を省略した．
[^3]: こうした挙動は [`patchelf`](https://github.com/NixOS/patchelf) や [`patchShebang`](https://github.com/NixOS/nixpkgs/blob/master/pkgs/build-support/setup-hooks/patch-shebangs.sh) によって実現されている．
[^4]: [The Twelve-Factor App](https://12factor.net/) の [V. Build, release, run](https://12factor.net/build-release-run) を参照のこと．
[^5]: 「調達せざるを得ない」と言い換えてもよい．
[^6]: Lambda function などの一部の例外を除く．
[^7]: 後述する社内用 CLI を通じて，OAuth 2.0 Device Authorization Grant を利用し認可を行う形式への移行を徐々に進めている．
[^8]: 実はこれ自体も Nix expression で記述された値であり，実態は巨大な attribute set である．
[^9]: flakes が stable になればそちらへの移行を検討することになるだろう．
[^10]: [The Twelve-Factor App](https://12factor.net/) の [X. Dev/prod parity](https://12factor.net/dev-prod-parity) を参照のこと．
[^11]: かつては CircleCI を利用しており，今でも一部で稼働している．
[^12]: Amazon EKS で構築した Kubernetes クラスタ上で稼働しているため，AWS 上の各種リソースへのアクセスが安全かつ簡便に行えるようになっている．
[^13]: ちなみに，この Docker image 自体も Nix を用いてビルドされている．[GitHub Actions Runner 自体も Nix のパケッジとして利用できる](https://github.com/NixOS/nixpkgs/blob/master/pkgs/development/tools/continuous-integration/github-runner/default.nix)ため，比較的簡単に作成することができる．
[^14]: Nix におけるビルドキャッシュの取得元のこと．
