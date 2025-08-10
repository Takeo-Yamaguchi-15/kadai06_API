// 絶版本・無料本文ハンター（解説入り） /* アプリ名および説明 */ 
(() => { // 即時実行関数によるスコープ閉包 /* 変数汚染防止の仕組み */
  const API_BASE = "https://www.googleapis.com/books/v1/volumes"; // Google Books 検索APIのベースURLの定義
  const cfg = (window.FBH_CONFIG || {}); // 外部設定オブジェクトの参照
  const state = { startIndex: 0, totalItems: 0, lastQuery: null }; // ページングと直近クエリの状態管理オブジェクト

  // --- DOM --- // 主要DOM要素の参照収集
  const form = document.getElementById('searchForm'); // 検索フォーム要素の参照
  const resultsEl = document.getElementById('results'); // 結果表示グリッドの参照
  const statusBar = document.getElementById('statusBar'); // ステータス表示領域の参照
  const prevBtn = document.getElementById('prevBtn'); // 前ページボタンの参照
  const nextBtn = document.getElementById('nextBtn'); // 次ページボタンの参照
  const pageInfo = document.getElementById('pageInfo'); // ページ情報表示領域の参照
  const clearBtn = document.getElementById('clearBtn'); // クリアボタンの参照

  // --- Helpers --- // 補助関数群の定義
  function escQuotes(s) { return (s || '').replace(/\"/g, '\\"').trim(); } // 引用符のエスケープと前後空白除去の処理
  function buildQ({ q, subject, publisher }) { // Booksのフィールド演算子を含む検索クエリ生成関数
    const parts = []; // クエリ片の配列
    if (q && q.trim()) parts.push(q.trim()); // フリーテキスト条件の追加
    if (subject && subject.trim()) parts.push(`subject:"${escQuotes(subject)}"`); // subject演算子の追加
    if (publisher && publisher.trim()) parts.push(`inpublisher:"${escQuotes(publisher)}"`); // inpublisher演算子の追加
    return parts.join(" "); // スペース結合による最終クエリの返却
  }

  function buildURL(params) { // API呼び出しURLの組み立て関数
    const u = new URL(API_BASE); // ベースURLオブジェクトの生成
    const sp = new URLSearchParams(params); // クエリパラメータの生成
    if (cfg.API_KEY) sp.set("key", cfg.API_KEY); // APIキー付与（任意）
    u.search = sp.toString(); // URLへのクエリ適用
    return u.toString(); // 完成URLの返却
  }

  function imgHttps(url) { // 画像URLのHTTPS化関数
    if (!url) return ""; // 空URL対策
    try { return url.replace(/^http:\/\//i, "https://"); } catch { return url; } // 混在コンテンツ回避の置換
  }

  function setStatus(msg) { statusBar.textContent = msg || ""; } // ステータス文字列の表示処理

  function render(items = []) { // 結果カード群の描画関数
    resultsEl.innerHTML = ""; // 既存結果のクリア
    if (!items.length) { // 件数ゼロ時の分岐
      resultsEl.innerHTML = '<div class="note">該当する結果がありません。</div>'; // 空結果のメッセージ表示
      return; // 早期終了
    }
    const frag = document.createDocumentFragment(); // DOM断片の生成による描画効率化

    items.forEach(item => { // 1件ずつのカード生成ループ
      const v = item.volumeInfo || {}; // 書誌情報の取得
      const a = item.accessInfo || {}; // アクセス情報の取得
      const s = item.saleInfo || {};   // 販売情報の取得

      const card = document.createElement('article'); // カード要素の生成
      card.className = 'card'; // カード用クラスの付与

      const cover = document.createElement('div'); // 表紙ラッパー要素の生成
      cover.className = 'cover'; // クラスの付与
      const img = document.createElement('img'); // 画像要素の生成
      img.alt = v.title || 'No cover'; // 代替テキストの設定
      img.loading = "lazy"; // 遅延読み込みの指定
      img.src = imgHttps((v.imageLinks && (v.imageLinks.thumbnail || v.imageLinks.smallThumbnail)) || ""); // サムネイルURLの設定
      cover.appendChild(img); // ラッパーへの画像挿入

      const body = document.createElement('div'); // 本文領域の生成
      body.className = 'card-body'; // クラスの付与

      const title = document.createElement('div'); // タイトル行の生成
      title.className = 'title'; // クラスの付与
      const titleLink = document.createElement('a'); // タイトルリンク要素の生成
      titleLink.href = v.infoLink || v.canonicalVolumeLink || '#'; // 詳細ページリンクの設定
      titleLink.target = "_blank"; // 新規タブでのオープン指定
      titleLink.rel = "noopener"; // セキュリティ属性の付与
      titleLink.textContent = v.title || "(無題)"; // 表示タイトルの設定
      title.appendChild(titleLink); // タイトル行へのリンク挿入

      const meta = document.createElement('div'); // メタ情報行の生成
      meta.className = 'meta'; // クラスの付与
      const authors = (v.authors || []).join(", "); // 著者名の結合
      const line = [ // メタ情報の配列
        authors ? `著者: ${authors}` : null, // 著者名の表示
        v.publisher ? `出版社: ${v.publisher}` : null, // 出版社名の表示
        v.publishedDate ? `出版: ${v.publishedDate}` : null, // 出版日の表示
        v.pageCount ? `頁: ${v.pageCount}` : null // ページ数の表示
      ].filter(Boolean).join(" / "); // 空要素除去と連結
      meta.textContent = line; // メタ情報の文字列適用

      const badges = document.createElement('div'); // バッジ行の生成
      badges.className = 'badges'; // クラスの付与
      if (a.viewability) { // 閲覧可否情報の有無確認
        const b = document.createElement('span'); // バッジ要素の生成
        b.className = 'badge'; // クラスの付与
        b.textContent = `View: ${a.viewability}`; // 閲覧状態の表示
        badges.appendChild(b); // バッジ行への追加
      }
      if (s.saleability) { // 販売可否情報の有無確認
        const b = document.createElement('span'); // バッジ要素の生成
        b.className = 'badge'; // クラスの付与
        b.textContent = `Sale: ${s.saleability}`; // 販売状態の表示
        badges.appendChild(b); // バッジ行への追加
      }
      if (v.language) { // 言語情報の有無確認
        const b = document.createElement('span'); // バッジ要素の生成
        b.className = 'badge'; // クラスの付与
        b.textContent = `Lang: ${v.language}`; // 言語コードの表示
        badges.appendChild(b); // バッジ行への追加
      }

      body.appendChild(title); // 本文領域へのタイトル挿入
      if (line) body.appendChild(meta); // メタ情報の条件付き挿入
      body.appendChild(badges); // バッジ行の挿入

      const links = document.createElement('div'); // リンク群のラッパー生成
      links.className = 'links'; // クラスの付与

      const addBtn = (label, url) => { // リンクボタン生成の補助関数
        if (!url) return; // URL欠如時の無視処理
        const aEl = document.createElement('a'); // アンカー要素の生成
        aEl.className = 'link-btn'; // クラスの付与
        aEl.href = url; // 遷移先URLの設定
        aEl.target = "_blank"; // 新規タブでのオープン指定
        aEl.rel = "noopener"; // セキュリティ属性の付与
        aEl.textContent = label; // ボタン表示ラベルの設定
        links.appendChild(aEl); // リンク群への追加
      };

      // 入手先リンク集約 // 閲覧・情報・購入・ダウンロードのリンク配置
      addBtn('Preview', v.previewLink); // プレビューリンクの追加
      addBtn('Read (WebReader)', a.webReaderLink); // WebReaderリンクの追加
      addBtn('Info', v.infoLink || v.canonicalVolumeLink); // 情報ページリンクの追加
      if (s.buyLink) addBtn('Buy', s.buyLink); // 購入リンクの条件付き追加

      // ダウンロード（public domain 等に限る） // ダウンロードリンクの条件付き表示
      if (a.pdf && a.pdf.isAvailable && a.pdf.downloadLink) addBtn('PDF', a.pdf.downloadLink); // PDFダウンロードリンクの追加
      if (a.epub && a.epub.isAvailable && a.epub.downloadLink) addBtn('EPUB', a.epub.downloadLink); // EPUBダウンロードリンクの追加

      card.appendChild(cover); // カードへの表紙領域挿入
      card.appendChild(body); // カードへの本文領域挿入
      card.appendChild(links); // カードへのリンク群挿入

      frag.appendChild(card); // フラグメントへのカード追加
    });

    resultsEl.appendChild(frag); // DOMへのフラグメント一括挿入
  }

  function updatePager({startIndex, maxResults, totalItems}) { // ページャ表示更新関数
    const curPage = Math.floor(startIndex / maxResults) + 1; // 現在ページ番号の算出
    const totalPages = Math.max(1, Math.ceil(totalItems / maxResults)); // 総ページ数の算出
    pageInfo.textContent = `${curPage} / ${totalPages} ページ（${totalItems}件）`; // ページ情報の反映
    prevBtn.disabled = startIndex <= 0; // 前ページ可否の切替
    nextBtn.disabled = startIndex + maxResults >= totalItems; // 次ページ可否の切替
  }

  async function search(startIndexOverride = 0) { // 検索実行関数
    const fd = new FormData(form); // フォームデータの取得
    const q = buildQ({ // 検索クエリの構築
      q: fd.get('q'), // キーワードの取得
      subject: fd.get('subject'), // subject条件の取得
      publisher: fd.get('publisher') // 出版社条件の取得
    });
    const filter = fd.get('filter') || ""; // 公開状態の取得
    const orderBy = fd.get('orderBy') || "relevance"; // 並び順の取得
    const lang = fd.get('lang') || ""; // 言語条件の取得
    const maxResults = parseInt(fd.get('maxResults') || "20", 10); // 件数の数値化
    const download = fd.get('download') || ""; // ダウンロード条件の取得
    const printType = fd.get('printType') || "books"; // 種別条件の取得

    if (!q) { // クエリ未入力時の防御
      setStatus("キーワード、あるいは subject / inpublisher を入力してください。"); // 入力促しメッセージの表示
      resultsEl.innerHTML = ""; // 結果領域のクリア
      return; // 早期終了
    }

    const params = { q, orderBy, maxResults, startIndex: startIndexOverride, printType }; // 基本パラメータの組み立て
    if (filter) params.filter = filter; // filterの条件付き付与
    if (lang) params.langRestrict = lang; // 言語制限の条件付き付与
    if (download) params.download = download; // ダウンロード条件の条件付き付与

    const url = buildURL(params); // 最終URLの生成
    state.lastQuery = { ...params }; // 直近クエリの保存
    setStatus("検索中…"); // 実行中メッセージの表示

    try { // 呼び出し例外処理の開始
      const res = await fetch(url); // API呼び出しの実行
      if (!res.ok) throw new Error(`HTTP ${res.status}`); // HTTPエラーの検出
      const data = await res.json(); // JSONレスポンスの解析

      const items = data.items || []; // 結果配列の取り出し
      state.totalItems = data.totalItems || items.length; // 総件数の保存
      state.startIndex = params.startIndex || 0; // 現在開始位置の保存

      setStatus(""); // ステータスのクリア
      render(items); // 結果描画の実行
      updatePager({ startIndex: state.startIndex, maxResults, totalItems: state.totalItems }); // ページャ更新の実行
    } catch (err) { // 例外発生時の分岐
      console.error(err); // デバッグログの出力
      setStatus("エラーが発生しました。ネットワークやAPIキー設定を確認してください。"); // エラーメッセージの表示
    }
  }

  // --- Event bindings --- // イベントバインド群
  form.addEventListener('submit', (e) => { // フォーム送信時のイベント処理
    e.preventDefault(); // ブラウザ標準送信の抑止
    state.startIndex = 0; // ページ先頭へのリセット
    search(0); // 検索の実行
  });

  clearBtn.addEventListener('click', () => { // クリアボタンクリック時の処理
    form.reset(); // 入力値のリセット
    document.getElementById('filter').value = 'free-ebooks'; // filter初期値の再設定
    document.getElementById('lang').value = 'ja'; // 言語初期値の再設定
    document.getElementById('orderBy').value = 'relevance'; // 並び順初期値の再設定
    document.getElementById('maxResults').value = '20'; // 件数初期値の再設定
    resultsEl.innerHTML = ""; // 結果領域のクリア
    setStatus(""); // ステータスのクリア
    pageInfo.textContent = ""; // ページ情報のクリア
    prevBtn.disabled = nextBtn.disabled = true; // ページャボタンの無効化
  });

  prevBtn.addEventListener('click', () => { // 前ページボタンクリック時の処理
    const maxResults = parseInt(document.getElementById('maxResults').value || "20", 10); // 件数値の取得
    const newStart = Math.max(0, state.startIndex - maxResults); // 新しい開始位置の計算
    state.startIndex = newStart; // 状態の更新
    search(newStart); // 再検索の実行
  });

  nextBtn.addEventListener('click', () => { // 次ページボタンクリック時の処理
    const maxResults = parseInt(document.getElementById('maxResults').value || "20", 10); // 件数値の取得
    const newStart = state.startIndex + maxResults; // 新しい開始位置の計算
    if (newStart >= state.totalItems) return; // 越境防止の早期終了
    state.startIndex = newStart; // 状態の更新
    search(newStart); // 再検索の実行
  });

  // 初回フォーカス // ユーザビリティ向上の初期処理
  document.getElementById('q').focus(); // キーワード入力欄へのフォーカス付与
})(); // 即時実行関数の終了