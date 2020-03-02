# kc-node-importer-for-servicenow

Kompira cloud Sonarで検出したノード情報をServiceNowの構成情報としてインポートするスクリプト

## セットアップ

### Script Include登録

ServiceNow管理画面から、 `System definition` => `Script Include` に移動。
「New」をクリックし、下記の通り入力し、Submitで登録する。

- Name: `KcNodeImporter` (この名前でないと動作しません)
- Description: `Script to import Kompira cloud node into CMDB`
- Script: 同梱している `KcNodeImporter.js` の中身を貼り付ける

### Scheduled Jobs登録

ServiceNow管理画面から、 `System definition` => `Scheduled Jobs` に移動。
「New」をクリックし、 `Automatically run a script of your choosing` を選択、次の画面にて下記の通り入力し、Submitで登録する。

- Name: 任意のジョブ名を設定( `Kompira cloud sync` 等)
- Run: 定期実行したい間隔を設定
- Run this script: 同梱している `ScheduledScript_Sample.js` の中身を貼り付け、下記の部分を自分のスペース情報に書き換える
    - `{Kompira cloud API token}` : Kompira cloudのAPIトークン
    - `管理ノードリストのURL` : 同期したい管理ノード一覧のURL
      KC側にネットワークが複数存在する場合は、複数記述することでまとめてインポートが可能
      また、`[ServiceNow domain name]` を指定することでネットワーク毎に異なるServiceNowドメインにインポートが可能

尚、複数のKompira cloudスペースからインポートする場合は、スペース分ジョブを登録することでインポートを行う。


## その他補足事項

### 手動実行

上記Scheduled Jobsに登録したジョブを開き、「Execute Now」で実行。
もしくは、 `Scripts - Background` に上記ジョブのスクリプトを貼り付けて実行でも可。

### 制約事項

- Kompira cloud側のノードID格納に「資産管理番号(Asset tag)」カラムを使用しています
  本カラムによってKcのノードとの結びつけを行うため、この値は書き換えないようにしてください。
- Kcノードに登録されている「ノート」については、Commentsカラムに書き込まれます
  ただしServiceNowの制限により、4000文字以上の場合は切り捨てられます。
  また、Linuxサーバー以外ではSN側の画面仕様により、Comments自体が表示されません(データとしては入っています)
- HostnameについてはDNSにより名前解決できる場合のみ入ります(Kc側の仕様となります)
- Manufacturer, Model ID, CPU manufacturerについては、存在しない場合該当テーブルに新規データが追加されます
