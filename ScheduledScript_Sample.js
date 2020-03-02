// ### Kompiraスペース設定 ###

var kc_importer = new KcNodeImporter('{Kompira cloud API token}');

// Basic認証付きスペースの場合
// var kc_importer = new KcNodeImporter('[Kompira cloud API token]', 'username', 'password');


// ### Import設定 ###

// 管理ノードリストからのインポート
kc_importer.importManagedNodes('https://hogefuga.cloud.kompira.jp/apps/sonar/networks/{networkId}/managed-nodes');

// 管理ノードリストからのインポート(ServiceNowドメイン指定付き)
kc_importer.importManagedNodes('https://hogefuga.cloud.kompira.jp/apps/sonar/networks/{networkId}/managed-nodes', '[ServiceNow domain name]');

// 単一ノードのインポート
// kc_importer.importManagedNode('https://hogefuga.cloud.kompira.jp/apps/sonar/networks/{networkId}/managed-nodes/{nodeId}');

// 単一ノードのインポート(ServiceNowドメイン指定付き)
// kc_importer.importManagedNode('https://hogefuga.cloud.kompira.jp/apps/sonar/networks/{networkId}/managed-nodes/{nodeId}', '[ServiceNow domain name]');



gs.log('Import from Kompira cloud has been completed');
