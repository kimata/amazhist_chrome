# amazhist_chrome

amazhist_chrome は，Amazon の買い物履歴情報を取得する Chrome 拡張です．

![スクリーンショット](img/movie.gif)

## インストール

1. Chrome の「拡張機能」タブでディベロッパーモードを有効化．

2. 「パッケージ化されていない拡張機能を読み込む」で，amazhist_chrom の **src ディレクトリ** を指定．

![スクリーンショット](img/usage_1.png)

## 使い方

1. アドレスバーの右側にある Amazhist Chrome Extension のアイコンをクリックします．(拡張機能が沢山ある場合は，アドレスバーの右側のジグゾーパズルのようなアイコンをクリックすると，現れると思います)

2. 「スタート」ボタンをクリックすると，データの収集が始まります．

3. 「保存」ボタンをクリックすると，収集したデータを CSV 形式に保存できます．


## TODO

- レジューム機能の追加．
  現時点だと，何らかの理由で動作が一旦停止すると途中から再開できません．

- Background scripts からのコードの移動
  Manifest V3 になると，ServiceWorker (V2 での Background scripts は 5分毎にリロードされるので，コードを移動する必要あり．

  参考: [Issue 1152255: ServiceWorker is shut down every 5 minutes for manifest V3 extension](https://bugs.chromium.org/p/chromium/issues/detail?id=1152255)
