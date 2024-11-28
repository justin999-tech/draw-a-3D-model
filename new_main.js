import linearRegression3D from "./analysis3d.js";

//points and planes record all fetched infos
var points = [], planes = [];
// showed_stock prevent double fetching the same stock
var showed_stock = [];

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("submit").addEventListener("click", submit);
});

// Add value into points and planes, then update graph
function add_data(tbl, name) {
    // 三維散點數據
    var xValues = tbl.map(item => parseFloat(item["月份"]));
    var yValues = tbl.map(item => parseFloat(item["交易量"].replace(/,/g, "")));
    var zValues = tbl.map(item => parseFloat(item["加權(A/B)平均價"].replace(/,/g, "")));

    // 計算回歸平面參數
    const { a, b, c } = linearRegression3D(xValues, yValues, zValues);

    // 構建回歸平面
    const xRange = [Math.min(...xValues), Math.max(...xValues)];
    const yRange = [Math.min(...yValues), Math.max(...yValues)];
    const xGrid = [];
    const yGrid = [];
    const zGrid = [];

    for (let x = xRange[0]; x <= xRange[1]; x += (xRange[1] - xRange[0]) / 10) {
        const rowX = [], rowY = [], rowZ = [];
        for (let y = yRange[0]; y <= yRange[1]; y += (yRange[1] - yRange[0]) / 10) {
            rowX.push(x);
            rowY.push(y);
            rowZ.push(a * x + b * y + c);
        }
        xGrid.push(rowX);
        yGrid.push(rowY);
        zGrid.push(rowZ);
    }

    // 三維散點
    const trace1 = {
        x: xValues,
        y: yValues,
        z: zValues,
        mode: 'markers',
        type: 'scatter3d',
        name: name,
        marker: { size: 4, color: 'blue' }
    };

    // 回歸平面
    const trace2 = {
        x: xGrid.flat(),
        y: yGrid.flat(),
        z: zGrid.flat(),
        type: 'surface',
        name: `${name} 平面`,
        opacity: 0.6,
        colorscale: 'Viridis'
    };

    points.push(trace1);
    planes.push(trace2);
    show_graph();
}

// Update graph
function show_graph() {
    const layout = {
        title: '三維線性回歸分析',
        scene: {
            xaxis: { title: '月份' },
            yaxis: { title: '交易量' },
            zaxis: { title: '均價' }
        }
    };

    Plotly.react('myDiv', points.concat(planes), layout);
}

async function submit() {
    var stock_id = document.getElementById("input_stock");
    if (showed_stock.includes(stock_id.value)) {
        alert(`Has Showed ${stock_id.value}`);
        return;
    }

    console.log("股票代號：" + stock_id.value);
    showed_stock.push(stock_id.value);

    var { data: html_tbl, firstRow: stockName } = await fetchAndConvertTableToJSON(stock_id.value);
    console.log("以下為讀取到的資料");
    for (var i = 0; i < html_tbl.length; i++) console.log(html_tbl[i]);

    console.log(stockName);

    add_data(html_tbl, stockName);
}

async function fetchAndConvertTableToJSON(stock) {
    if (!stock || stock === "0") {
        console.error("請輸入有效的股票代碼。");
        return;
    }

    const url = `https://www.twse.com.tw/rwd/zh/afterTrading/FMSRFK?date=20241114&stockNo=${stock}&response=html`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`無法取得數據，HTTP 錯誤狀態碼：${response.status}`);
            return;
        }

        const htmlText = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');

        const table = doc.querySelector("table");
        if (!table) {
            console.error("找不到表格數據，請確認股票代碼是否正確。");
            return;
        }

        const firstRow = table.querySelector("thead > tr > th").innerText.replace(/\s+/g, ' ').trim();
        const headers = Array.from(table.querySelectorAll("thead tr:nth-child(2) th")).map(th => th.innerText.trim());
        const rows = Array.from(table.querySelectorAll("tbody tr"));
        console.log(`總共有 ${rows.length} 行數據`);

        const data = rows.map(row => {
            const cells = row.querySelectorAll("td");
            const rowData = {};

            headers.forEach((header, i) => {
                rowData[header] = cells[i] ? cells[i].innerText.trim() : '';
            });

            return rowData;
        });

        return { data, firstRow };
    } catch (error) {
        console.error("發生錯誤：", error);
    }
}
