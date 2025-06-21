
let apiKey = "";

// hello this is a test to see if git works


const liveBlock = document.getElementById('liveBlock');  // 실시간 시각화가 이뤄지는 단 하나의 block
const currentCanvases = liveBlock.querySelectorAll('canvas');  // block 안의 6개 canvas들 (layer1Lines1 ~ layer1Lines6)
const snapshotsContainer = document.getElementById('snapshotContainer1hr');  // 10분마다 block snapshot이 쌓이는 영역
const archive = document.getElementById('archive');  // 1시간마다 snapshotContainer1hr가 이미지로 저장되는 영역


let layer0, layer1, layer2, layer3, layer4, layer5, layer6;


let activeCanvases = []; // 현재 활성화된 캔버스들
let weatherData  = {};  // 날씨 데이터 저장용

let windSpeed = 0;
let windDeg = 0;
let windGust = 0; 
let vComponent= 0;
let uComponent = 0;
let temperature = 0; 
let humidity = 0; 
let pressure = 0; 
let lineThicknesses = [];
let totalLines = 100;
let totalLinesGrid = 10;

let windBars = [];
let angleOffset = 0;
let rotateForward = true;

let sunprogress = 0;
let variance = 0;
let previousSpeeds = [];
let realSpeeds = [];
let lastWindSpeed = null;
let lastWindDeg = null;
let lastTemperature = null;
let cols = 6;
let rows = 10;
let colSizes1 = [];
let rowSizes1 = [];
let colOffsets1 = [];
let rowOffsets1 = [];
let colSizes2 = [];
let rowSizes2 = [];
let colOffsets2 = [];
let rowOffsets2 = [];

//graphic6 변수
let colSet = [];
let colorData;
let finalColors;

let densityBands = [];
let lineCount = 60;
let rectCount = 50;
let rectWidth = 0;
let rectOffset = 0;
let rectHeight;
let alphaMin = 120;
let alphaMax = 255;
let swSlider = 0.5; 
let spSlider = 1;
let twist = 50;

let sunProgressColorMap;
window.layerColors = {}; // {1: "#xxxxxx", 2: "#xxxxxx", ...}

let liveBlockTargetHeight = 550; // 최종 목표 높이(px)
let liveBlockCurrentHeight = 0;  // 현재 높이(px)
// let liveBlockGrowSpeed = 0.0111;    // 1프레임당 증가량 (조절 가능)
let liveBlockGrowSpeed = 0.1;

// 예시: 6개 레이어 각각
let layerHeights = [0, 0, 0, 0, 0, 0];         // 현재 높이
let layerTargetHeights = [445, 550, 410, 400, 386, 360]; // 목표 높이 (각 레이어별)
let layerGrowSpeeds = [0.03, 0.05, 0.015, 0.02, 0.015, 0.025]; // 각 레이어별 속도

let first_time_fetch_weather_received = false;

let update10minutes_called_counter = 0;

function preload() {
    sunProgressColorMap = loadJSON("sunProgressColorMap.json");
}


function setup() {
    
    noCanvas(); // 메인 canvas는 안 씀
    
    initializeGrid1();
    initializeGrid2();
    createBlock(); // block 생성


    // drawPatternLines(window.layer6, 1100, 200, 0);

    initializeWindBars();
    
    
    
    // fot first value of speed
    for (let i = 0; i < 10; i++) {
        let noiseSpeed = 2 + random(-0.5, 0.5);
        realSpeeds.push(noiseSpeed);
    }
        
    getCurrentLocationWeather(); 
    setInterval(update10minutes, 600000);
    
}





function draw() {
    
    if (first_time_fetch_weather_received && update10minutes_called_counter == 0) {
        // update10minutes();
    }
    
    drawGraphicsToBlock(weatherData);
    
    
    // 항상 매 프레임마다 모든 레이어를 다시 그림 (애니메이션)
    if (!window.layer1 || !window.layer2 || !window.layer3 || !window.layer4 || !window.layer5 || !window.layer6) return;
    if (!weatherData || !weatherData.wind) return;
    
    // console.log("frameCount:", frameCount, "vComponent:", weatherData.vComponent, "uComponent:", weatherData.uComponent, "windSpeed:", weatherData.wind.speed);
    
    let rotateSpeed = getRotateSpeed(windSpeed / 2);
    rotateForward ? angleOffset += rotateSpeed : angleOffset -= rotateSpeed;
    if (angleOffset > radians(70)) rotateForward = false;
    if (angleOffset < 0) rotateForward = true;
    
    // if (!layer1 || !layer2 || !layer3 || !layer4 || !layer5 || !layer6) {
    //   fill(0);
    //   textAlign(CENTER, CENTER);
    //   // console.log("if statement thingie")
    //   text("Graphics not ready yet...", width / 2, height / 2);
    //   return; // 그리기 중단
    // }
    
    
    for (let i = 0; i < 6; i++) {
        if (layerHeights[i] < layerTargetHeights[i]) {
            layerHeights[i] += layerGrowSpeeds[i];
            if (layerHeights[i] > layerTargetHeights[i]) {
                layerHeights[i] = layerTargetHeights[i];
            }
            let canvasEl = document.getElementById(`layer${i+1}-canvas`);
            if (canvasEl) {
                canvasEl.style.height = layerHeights[i] + "px";
            }
        }
    }

    
    
    // if (liveBlockCurrentHeight < liveBlockTargetHeight) {
    //   liveBlockCurrentHeight += liveBlockGrowSpeed;
    //   if (liveBlockCurrentHeight > liveBlockTargetHeight) {
    //     liveBlockCurrentHeight = liveBlockTargetHeight;
    //   }
    // 실제 DOM에 적용
    const liveBlockDiv = document.getElementById('liveBlock');
    if (liveBlockDiv) {
        liveBlockDiv.style.height = layerHeights[1] + "px";
    }

    //createGraphics들 속도
    for (let i = 0; i < 6; i++) {
        if (layerHeights[i] < layerTargetHeights[i]) {
            layerHeights[i] += layerGrowSpeeds[i];
            if (layerHeights[i] > layerTargetHeights[i]) {
                layerHeights[i] = layerTargetHeights[i];
            }
            // 실제 DOM에 적용
            let canvasEl = document.getElementById(`layer${i+1}-canvas`);
            if (canvasEl) {
                canvasEl.style.height = layerHeights[i] + "px";
            }
        }
    }
    
}



function pickColorGroupBySunHumidity(sunprogress, humidity, colorGroups, a = 0.6, b = 0.4) {
    let score = sunprogress * a + humidity * b;
    score = Math.max(0, Math.min(1, score));
    let idx = Math.floor(score * (colorGroups.length - 1));
    return colorGroups[idx];
}

function getHumidityGroup(humidity) {
    if (humidity <= 25) return "veryLow";
    if (humidity <= 45) return "low";
    if (humidity <= 65) return "medium";
    if (humidity <= 80) return "high";
    return "veryHigh";
}

function pickEmphasizedColor(chosenColorGroup, humidityColors) {
    let intersection = chosenColorGroup.filter(c => humidityColors.includes(c));
    if (intersection.length > 0) {
        return intersection[0];
    } else {
        return chosenColorGroup[Math.floor(Math.random() * chosenColorGroup.length)];
    }
}


function assignLayerColors(chosenColorGroup, humidityGroup, sunProgressColorMap) {
    // 1. 습도 그룹 컬러 후보
    const humidityColors = sunProgressColorMap.humidityGroups[humidityGroup] || [];
    // chosenColorGroup과 humidityColors의 교집합
    const intersection = chosenColorGroup.filter(c => humidityColors.includes(c));
    let humidityColor = intersection.length > 0 ? intersection[0] : null;
    
    
    let availableColors = [...chosenColorGroup];
    
    let layerColors = {};
    
    if (intersection.length >= 2) {
        // 습도컬러가 2개 이상이면 2,4에 각각 배정
        layerColors[2] = intersection[0];
        layerColors[4] = intersection[1];
        // 배정한 컬러는 availableColors에서 제거
        availableColors.splice(availableColors.indexOf(intersection[0]), 1);
        availableColors.splice(availableColors.indexOf(intersection[1]), 1);
    } else if (intersection.length === 1) {
        // 습도컬러가 1개면 2,4 중 하나에만 배정, 나머지는 남은 컬러 중 랜덤
        // 어느 레이어에 줄지 랜덤 결정
        const assignToLayer = Math.random() < 0.5 ? 2 : 4;
        layerColors[assignToLayer] = intersection[0];
        availableColors.splice(availableColors.indexOf(intersection[0]), 1);
        // 나머지 레이어(2 또는 4)는 남은 컬러 중 랜덤
        const otherLayer = assignToLayer === 2 ? 4 : 2;
        let idx = Math.floor(Math.random() * availableColors.length);
        layerColors[otherLayer] = availableColors[idx];
        availableColors.splice(idx, 1);
    } else {
        // 습도컬러가 없으면 2,4 모두 남은 컬러 중 랜덤
        let idx2 = Math.floor(Math.random() * availableColors.length);
        layerColors[2] = availableColors[idx2];
        availableColors.splice(idx2, 1);
        let idx4 = Math.floor(Math.random() * availableColors.length);
        layerColors[4] = availableColors[idx4];
        availableColors.splice(idx4, 1);
    }
    
    // 나머지 레이어(1,3,5,6): 남은 컬러 중 랜덤하게 하나씩 배정
    const otherLayers = [1, 3, 5, 6];
    otherLayers.forEach(layerNum => {
        let idx = Math.floor(Math.random() * availableColors.length);
        layerColors[layerNum] = availableColors[idx];
        availableColors.splice(idx, 1);
    });
    
    // window에 저장 (글로벌)
    window.layerColors = layerColors;
}

function createBlock() {
    // // console.log(`✅ layer1_${} created:`, window[`layer1_${}`]);
    // // console.log(`✅ layer2_${} created:`, window[`layer2_${}`]);
    
    // 항상 liveBlock 내부를 비우고 시작 (이전 캔버스 쌓임 방지)
    const liveBlock = document.getElementById('liveBlock');
    liveBlock.innerHTML = '';
    
    
    let containerWidth = 1100; // 최대 너비 1200px 제한
    let container = createDiv();
    container.class("canvasGroup");
    container.style("position", "relative");
    container.style("width", containerWidth + "px");
    // container.style("height", "400px");
    container.style.height = liveBlockCurrentHeight + "px"; 
    container.parent("liveBlock");
    
    window.layer1 = createGraphics(containerWidth, 445);
    window.layer2 = createGraphics(containerWidth, 550);
    window.layer3 = createGraphics(containerWidth, 410);
    window.layer4 = createGraphics(containerWidth, 400);
    window.layer5 = createGraphics(containerWidth, 386);
    window.layer6 = createGraphics(containerWidth, 360);
   
    //layer1
    // window[`layer1_${currentBlockIndex}`] = createGraphics(800, 200);
    let canvasEl1 = window.layer1.canvas;
    canvasEl1.id = "layer1-canvas"; // 원하는 id 부여
    canvasEl1.classList.add("layer-canvas", "layer1"); // 원하는 클래스 부여
    canvasEl1.style.height = layerHeights[0] + "px"; // 초기값 0
    canvasEl1.style.display = "block"; 
    canvasEl1.style.mixBlendMode = "normal";
    canvasEl1.style.position = "absolute";
    canvasEl1.style.left = "0px";
    canvasEl1.style.top = "0px";
    container.child(canvasEl1);
    
    
    // window[`layer2_${currentBlockIndex}`] = createGraphics(800, 900);
    let canvasEl2 = window.layer2.canvas;
    canvasEl2.id = "layer2-canvas";
    canvasEl2.classList.add("layer-canvas", "layer2");
    canvasEl2.style.height = layerHeights[0] + "px"; // 초기값 0
    canvasEl2.style.display = "block"; 
    canvasEl2.style.mixBlendMode = "multiply";
    canvasEl2.style.position = "absolute";
    canvasEl2.style.left = "0px";
    canvasEl2.style.top = "0px"; 
    canvasEl2.style.zIndex = 10;
    canvasEl2.style.top = "0px"; // 500px 캔버스의 중앙(250)이 200px container의 중앙(100)에 오도록
    container.child(canvasEl2);
    
    // window[`layer3_${currentBlockIndex}`] = createGraphics(800, 200);
    let canvasEl3 = window.layer3.canvas;
    canvasEl3.id = "layer3-canvas";
    canvasEl3.classList.add("layer-canvas", "layer3");
    canvasEl3.style.height = layerHeights[0] + "px"; // 초기값 0
    canvasEl3.style.display = "block"; 
    canvasEl3.style.mixBlendMode = "multiply";
    canvasEl3.style.position = "absolute";
    canvasEl3.style.left = "0px";
    canvasEl3.style.top = "0px"; 
    container.child(canvasEl3);
    initializeWindBars();
    
    // window[`layer4_${currentBlockIndex}`] = createGraphics(800, 100);
    let canvasEl4 = window.layer4.canvas;
    canvasEl4.id = "layer4-canvas";
    canvasEl4.classList.add("layer-canvas", "layer4");
    canvasEl4.style.height = layerHeights[0] + "px"; // 초기값 0
    canvasEl4.style.display = "block"; 
    canvasEl4.style.mixBlendMode = "multiply";
    canvasEl4.style.position = "absolute";
    canvasEl4.style.left = "0px";
    canvasEl4.style.top = "0px"; 
    container.child(canvasEl4); 
    
    // window[`layer5_${currentBlockIndex}`] = createGraphics(800, 100);
    let canvasEl5 = window.layer5.canvas;
    canvasEl5.id = "layer5-canvas";
    canvasEl5.classList.add("layer-canvas", "layer5");
    canvasEl5.style.height = layerHeights[0] + "px"; // 초기값 0
    canvasEl5.style.display = "block"; 
    canvasEl5.style.mixBlendMode = "multiply";
    canvasEl5.style.position = "absolute";
    canvasEl5.style.left = "0px";
    canvasEl5.style.top = "0px"; 
    container.child(canvasEl5);
    
    //window[`layer6_${currentBlockIndex}`] = createGraphics(800, 200);
    let canvasEl6 = window.layer6.canvas;
    canvasEl6.id = "layer6-canvas";
    canvasEl6.classList.add("layer-canvas", "layer6");
    canvasEl6.style.height = layerHeights[0] + "px"; // 초기값 0
    canvasEl6.style.display = "block"; 
    canvasEl6.style.mixBlendMode = "overlay";
    canvasEl6.style.position = "absolute";
    canvasEl6.style.left = "0px";
    canvasEl6.style.top = "0px";
    canvasEl6.style.zIndex = 20;
    container.child(canvasEl6);
    
    
}

function drawGraphicsToBlock(weatherData) {
    // // console.log(`🟢 drawGraphicsToBlock called for block index: ${}`);
    // // console.log("Weather Data in drawGraphicsToBlock:", weatherData);
    
    let vComponent = weatherData.vComponent;
    let uComponent = weatherData.uComponent;
    
    // console.log("drawGraphicsToBlock() is here"); 
    
    const g1 = window.layer1;
    const g2 = window.layer2;
    const g3 = window.layer3;
    const g4 = window.layer4;
    const g5 = window.layer5;
    const g6 = window.layer6;
    
    
    if (!g1 || !g2 || !g3 || !g4 || !g5 || !g6) {
        console.warn(`❗ layerX_$ 그래픽 중 일부가 아직 생성되지 않았습니다.`);
        return;
    }
    
    let cx = g1.width / 2;
    let cy = g1.height / 2;
    let h1 = g1.height; 
    layer1Lines(g1, cx, cy, h1, vComponent);
    // console.log('💨 layer1 drawn');
    // console.log("🚩 layer1 cx, cy:", cx, cy);
    
    let cx2 = g2.width / 2;
    let cy2 = g2.height / 2;
    let w2 = g2.width;
    let h2 = g2.height;
    layer2Lines(g2, cx2, cy2, w2, h2, uComponent);
    // console.log('💨 layer2 drawn');
    // console.log("🚩 layer2 cx2, cy2:", cx2, cy2);
    
    layer3Bars(g3, weatherData);
    // console.log('💨 layer3 drawn');
    
    layer4Grid1(g4, weatherData);
    // console.log('💨 layer4 drawn');
    
    layer5Grid2(g5, weatherData);
    // console.log('💨 layer5 drawn');
    
    layer6Pattern(g6, weatherData);
    // console.log('💨 layer6 drawn');
    
    
}

// function startWeatherLoop() {
//   fetchWeather(); // 첫 호출
//   setInterval(fetchWeather, 10 * 60 * 1000); // 10분마다 반복
// }



function update10minutes() {
    console.log("update10minutes() called");
    
    drawGraphicsToBlock(weatherData);
    
    // 1. flattenCanvas 생성 (liveBlock과 같은 크기)
    let flattenCanvas = createGraphics(1100, 550);
    flattenCanvas.clear();
    // debugFlattenCanvasBlendModes(flattenCanvas);
    
    
    flattenCanvas.blendMode(BLEND);
    flattenCanvas.image(window.layer1, 0, 0);
    
    flattenCanvas.blendMode(MULTIPLY);
    flattenCanvas.image(window.layer2, 0, 0);
    
    flattenCanvas.blendMode(ADD);
    flattenCanvas.image(window.layer3, 0, 0);
    
    flattenCanvas.blendMode(ADD);
    flattenCanvas.image(window.layer6, 0, 0);
    
    flattenCanvas.blendMode(MULTIPLY);
    flattenCanvas.image(window.layer4, 0, 0);
    
    flattenCanvas.blendMode(MULTIPLY);
    flattenCanvas.image(window.layer5, 0, 0);
    
    flattenCanvas.blendMode(BLEND); // 원래대로 복구
    
    // 2. flattenCanvas를 img로 변환
    const img = document.createElement("img");
    img.src = flattenCanvas.canvas.toDataURL("image/png");
    img.classList.add("snapshotImage");
    img.style.width = "1100px";
    img.style.height = "550px";
    img.style.display = "block";
    
    
    // 3. tenMinuteBlock에 추가
    const tenMinuteBlock = document.createElement("div");
    tenMinuteBlock.classList.add("tenMinuteBlock");
    tenMinuteBlock.style.width = "1100px";
    tenMinuteBlock.style.height = "550px"; 
    tenMinuteBlock.style.display = "flex";
    tenMinuteBlock.style.flexDirection = "row";
    tenMinuteBlock.style.alignItems = "flex-start";
    tenMinuteBlock.style.position = "relative";
    tenMinuteBlock.style.boxSizing = "border-box";
    
    // 이미지 snapshotImage
    img.style.display = "block";
    img.style.width = "1100px";
    img.style.height = "550px";
    img.style.position = "static";
    img.style.zIndex = "0";
    img.style.boxSizing = "border-box";
    tenMinuteBlock.appendChild(img);
    
    
    // infobox 복제
    const infoBox = document.getElementById("infoBox");
    if (infoBox) {
        const infoBoxClone = infoBox.cloneNode(true); // true: 자식까지 복제
        infoBoxClone.classList.add("snapshotInfoBox");
        // 스타일 조정 (필요시)
        infoBoxClone.style.width = "102px";
        infoBoxClone.style.height = "300px";
        infoBoxClone.style.margin = "0";
        infoBoxClone.style.fontSize = "8pt";
        infoBoxClone.style.position = "static";
        infoBoxClone.style.zIndex = "1";
        infoBoxClone.style.boxSizing = "border-box";
        tenMinuteBlock.appendChild(infoBoxClone);
    }
    
    // 4. snapshotContainer1hr에 추가
    const snapshotsContainer = document.getElementById('snapshotContainer1hr');
    if (snapshotsContainer) {
        snapshotsContainer.prepend(tenMinuteBlock);
        
        const tenMinuteBlocks = snapshotsContainer.querySelectorAll('.tenMinuteBlock');
        // console.log("tenMinuteBlocks length:", tenMinuteBlocks.length);
        
        if (tenMinuteBlocks.length >= 6) {
            moveToArchive(snapshotsContainer);
        }
        if (tenMinuteBlocks.length > 6) {
            for (let i = 6; i < tenMinuteBlocks.length; i++) {
                tenMinuteBlocks[i].remove();
            }
        }
    }
    
    // 5. 새로운 날씨 데이터 받아와서 liveBlock을 새로 그림
    getCurrentLocationWeather();

    update10minutes_called_counter += 1;
}


function moveToArchive(snapshotsContainer) {
    // 1. 6개 tenMinuteBlock을 하나의 div로 감싸기
    const hourBlock = document.createElement('div');
    hourBlock.classList.add('hourBlock');
    hourBlock.style.display = 'flex';
    hourBlock.style.flexDirection = 'column';
    
    // 최신이 위에 오도록 역순으로 추가
    const tenMinuteBlocks = Array.from(snapshotsContainer.querySelectorAll('.tenMinuteBlock'));
    tenMinuteBlocks.forEach(block => {
        hourBlock.appendChild(block);
    });
    
    // 2. archive에 맨 위에 추가
    const archiveDiv = document.getElementById('archive');
    archiveDiv.prepend(hourBlock);
    
    // 3. snapshotContainer1hr 비우기
    snapshotsContainer.innerHTML = '';
    
    // 4. hourBlock을 PNG로 export (html2canvas 사용)
    if (window.html2canvas) {
        
        
        const hourBlockWidthPx = hourBlock.offsetWidth;
        const targetWidthPx = 280 / 2.54 * 300;
        const scale = targetWidthPx / hourBlockWidthPx;
        
        // 캡처 전에 #infoBox 스타일 변경
        const infoBox = document.getElementById('infoBox');
        const originalTransform = infoBox.style.transform;
        const originalWritingMode = infoBox.style.writingMode;
        
        infoBox.style.transform = 'none';
        infoBox.style.writingMode = 'horizontal-tb';
        infoBox.style.whiteSpace = 'normal'; // 줄바꿈 허용
        infoBox.style.height = 'auto'; // 높이 자동 조정
        
        html2canvas(hourBlock, {
            backgroundColor: null,
            // scale: 6.20125 //a2
            // scale: 4.385 //a3
            scale: 3.1 //a4
            
        }).then(canvas => {
            
            // 캡처 후 #infoBox 스타일 복원
            infoBox.style.transform = originalTransform;
            infoBox.style.writingMode = originalWritingMode;
            infoBox.style.whiteSpace = 'nowrap'; // 원래 상태로 복원
            infoBox.style.height = '550px'; // 원래 높이 복원
            
            // 캡처된 이미지를 회전
            const rotatedCanvas = document.createElement('canvas');
            const ctx = rotatedCanvas.getContext('2d');
            rotatedCanvas.width = canvas.height;
            rotatedCanvas.height = canvas.width;
            
            // 캔버스를 90도 회전
            ctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
            
            //   // 이미지 데이터 생성
            const imgData = canvas.toDataURL('image/png');
            // 다운로드 트리거
            const link = document.createElement('a');
            link.href = imgData;
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-');
            link.download = `archive_hourblock_${timestamp}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    } else {
        console.warn('html2canvas 라이브러리가 로드되어 있지 않습니다. PNG export가 동작하지 않습니다.');
    }
}



function getCurrentLocationWeather() {
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            let lat = pos.coords.latitude;
            let lon = pos.coords.longitude;
            console.log(pos);
            fetchWeather(lat, lon);
            
        },
        (err) => {
            // console.log("❌ 위치 정보를 가져오는 데 실패:", err);
        }
    );
}




function fetchWeather(lat, lon) {
    // console.log("Fetching weather data...");
    
    let url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    
    loadJSON(url, (data) => {
        if (data.wind && 
            data.wind.speed !== undefined && 
            data.wind.deg !== undefined
        ) {
            
            // data.wind.speed = random(1, 10);
            // data.wind.deg = random(0, 360);
            // data.main.temp = random(10, 30);
            // data.main.humidity = random(10, 90); // 이 줄 추가!

              if (realSpeeds.length < 10) {
            // 초기 10개 데이터는 임의 값으로 채움 (variance 계산용)
            realSpeeds.push(random(1, 10)); // 🌪️ 초기 seed 데이터
          } else {
            // 10개 이후부터는 실제 API 데이터 사용
            realSpeeds.push(data.wind.speed); // ✅ 실제 풍속
            if (realSpeeds.length > 10) realSpeeds.shift(); // 큐 유지
          }
            
            
            windSpeed = data.wind.speed;
            windDeg = data.wind.deg;
            windGust = (data.wind.gust === undefined || data.wind.gust === 0)
            ? data.wind.speed
            : data.wind.gust;
            temperature = data.main.temp || 0; 
            humidity = data.main.humidity || 0; 
            pressure = data.main.pressure || 0; 
            vComponent = windSpeed * cos(radians(windDeg));
            uComponent = windSpeed * sin(radians(windDeg));
            
            if (data.sys && data.sys.sunrise && data.sys.sunset) {
                // 현재 시간(초, UTC)
                const now = Math.floor(Date.now() / 1000);
                
                // API에서 받은 sunrise/sunset (초, UTC)
                const sunrise = data.sys.sunrise;
                const sunset = data.sys.sunset;
                
                // sunprogress 계산 (0~1, 일출~일몰 사이만 0~1, 그 외는 0 또는 1)
                sunprogress = (now - sunrise) / (sunset - sunrise);
                sunprogress = Math.max(0, Math.min(1, sunprogress));
            } else {
                // fallback: 기존 방식 또는 0
                sunprogress = 0;
            }
            
            // 2. humidity 정규화
            let humidityNorm = humidity / 100; // 0~1
            
            // 3. 컬러그룹 선정
            let chosenColorGroup = pickColorGroupBySunHumidity(
                sunprogress,
                humidityNorm,
                sunProgressColorMap.sunProgressSets,
                0.6, // sunprogress 가중치
                0.4  // humidity 가중치
            );
            
            // 4. 습도 그룹 및 강조컬러 선정
            let humidityGroup = getHumidityGroup(humidity);
            let humidityColors = sunProgressColorMap.humidityGroups[humidityGroup];
            let emphasizedColor = pickEmphasizedColor(chosenColorGroup, humidityColors);
            
            // 5. 전역 변수로 저장 (드로잉 함수에서 사용)
            window.chosenColorGroup = chosenColorGroup;
            window.emphasizedColor = emphasizedColor;
            
            assignLayerColors(chosenColorGroup, humidityGroup, sunProgressColorMap);
            
            // realSpeeds.push(windSpeed);
            // if (realSpeeds.length > 10) realSpeeds.shift();
            
            
            //   let unique = [...new Set(realSpeeds)];
            //   if (unique.length >= 2) {
            //   previousSpeeds = [...realSpeeds];
            //   variance = calculateVariance(previousSpeeds);
            // }
            
            if (lastWindSpeed === null || windSpeed !== lastWindSpeed) {
                realSpeeds.push(windSpeed);
                if (realSpeeds.length > 10) realSpeeds.shift();
                lastWindSpeed = windSpeed;
                if (realSpeeds.length >= 2) {
                    previousSpeeds = [...realSpeeds];
                    variance = calculateVariance(previousSpeeds);
                }
                
                // console.log("draw all graphics done");
            }
            
            
            // console.log("windBars count:", windBars.length);
            
            // console.log("* API Success:");
            // console.log("* windSpeed:", windSpeed.toFixed(2));
            // console.log("* windDeg:", windDeg.toFixed(1));
            // console.log("* gust:", windGust.toFixed(2));
            // console.log("* variance:", variance.toFixed(4));
            // console.log("* raw gust from API:", data.wind.gust);
            
            // console.log("* uComponent:", uComponent.toFixed(3));
            // console.log("* vComponent:", vComponent.toFixed(3));
            // console.log("* temperature:", temperature.toFixed(1));
            // console.log("* humidity:", humidity.toFixed(1));
            // console.log("* pressure:", pressure.toFixed(1));
            
            
            lineThicknesses = [];
            let maxThickness = windSpeed;
            let minThickness = 0.08;
            let thicknessRange = maxThickness - minThickness;
            let thickThreshold = minThickness + thicknessRange * 0.7;
            let thinThreshold = minThickness + thicknessRange * 0.7;
            
            for (let i = 0; i < totalLines; i++) {
                if (i < totalLines / 2) {
                    lineThicknesses[i] = random(thickThreshold, maxThickness);
                } else {
                    lineThicknesses[i] = random(minThickness, thinThreshold);
                }
            }
            
            // // console.log("lineThicknesses:", lineThicknesses);
            // 선 두께를 섞어서 랜덤하게 배치
            shuffle(lineThicknesses, true);
            
        } else {
            // console.log("wind data 없음");
            // console.log("Updated weatherData:", weatherData);
        }
        
        //infobox 구성
        let currentTime = nf(hour(), 2) + ":" + nf(minute(), 2) + ":" + nf(second(), 2);
        let utc = new Date();
        let utcTime = nf(utc.getUTCHours(), 2) + ":" + nf(utc.getUTCMinutes(), 2) + ":" + nf(utc.getUTCSeconds(), 2);
        let u = windSpeed * sin(radians(windDeg));
        let v = windSpeed * cos(radians(windDeg));
        let locationName = weatherData.name || `${lat.toFixed(2)},${lon.toFixed(2)}`;
        let gustInfo = (windGust === windSpeed)
        ? "steady"
        : `${windGust.toFixed(2)} m/s`;
        
        let info1 = `Local: ${currentTime} | Location: ${locationName}`;
        let info2 = `WS: ${windSpeed.toFixed(2)} m/s | WD: ${windDeg.toFixed(2)}°`;
        let info3 = `u: ${u.toFixed(2)} m/s | v: ${v.toFixed(2)} m/s`;
        let info4 = `Var: ${variance.toFixed(4)} m/s | WindGust: ${gustInfo} m/s`;
        let info5 = `Temperture: ${temperature.toFixed(1)}°C | Humidity: ${humidity.toFixed(1)}%`;
        let info6 = `Pressure: ${pressure.toFixed(1)}hPa  | SunProgress: ${(sunprogress * 100).toFixed(1)}%`;
        document.getElementById("infoBox").innerText = `${info1}\n${info2}\n${info3}\n${info4}\n${info5}\n${info6}`;
        
        weatherData = data;
        weatherData.vComponent = vComponent;
        weatherData.uComponent = uComponent;
        weatherData.lat = lat;
        weatherData.lon = lon;
        
        // console.log("drawGraphicsToBlock is here");
        
        liveBlockCurrentHeight = 0;
        layerHeights = [0, 0, 0, 0, 0, 0];
        
        createBlock();
        drawGraphicsToBlock(weatherData);
        // console.log("drawGraphicsToBlock is here");

        first_time_fetch_weather_received = true;
        
    });
}



function calculateVariance(arr) {
    if (arr.length < 2) return 0;
    let mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
}













function initializeWindBars() {
    let layer = window.layer3;
    // console.log("✅ initializeWindBars called, layer3:", layer);
    // if (!layer) {
    //   console.error(`❌ layer3_${} is undefined`);
    //   return;
    // }
    
    // if (!layer3) {
    //   console.warn("⚠ layer3가 아직 생성되지 않음. 초기화 중단.");
    //   return;
    // }
    
    windBars = [];
    let cols = 6;
    let rows = 26;
    
    const cellW = layer.width / cols;
    const cellH = 1100 / rows;
    
    // console.log("cellW:", cellW, "cellH:", cellH);
    
    let allBars = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            let cx = c * cellW + cellW / 2;
            let cy = r * cellH + cellH / 2;
            allBars.push({ x: cx, y: cy });
        }
    }
    
    
    // console.log("allBars length:", allBars.length);
    
    let minBars = 80;
    let maxBars = 156;
    let numBars = floor(map(windSpeed, 1.5, 32.6, minBars, maxBars));
    numBars = constrain(numBars, minBars, maxBars);
    
    let selectedIndices = [];
    while (selectedIndices.length < numBars) {
        let randIndex = floor(random(allBars.length));
        if (!selectedIndices.includes(randIndex)) {
            selectedIndices.push(randIndex);
            windBars.push(allBars[randIndex]);
        }
        
        // // console.log("windBars count:", windBars.length);
        // // console.log("Sample windBar:", windBars[0]);
    }
}

function initializeGrid1() {
    let colWidth = 800 / cols;
    let rowHeight = 1100 / rows;
    
    for (let i = 0; i < cols; i++) {
        colSizes1[i] = colWidth;
        colOffsets1[i] = random(TWO_PI);
    }
    for (let j = 0; j < rows; j++) {
        rowSizes1[j] = rowHeight;
        rowOffsets1[j] = random(TWO_PI);
    }
}

function initializeGrid2() {
    let colW = 800 / cols;
    let rowH = 1100 / rows;
    for (let i = 0; i < cols; i++) {
        colSizes2[i] = colW;
        colOffsets2[i] = random(TWO_PI);
    }
    for (let j = 0; j < rows; j++) {
        rowSizes2[j] = rowH;
        rowOffsets2[j] = random(TWO_PI);
    }
}

function initializeDensityBands() {
    densityBands = []    
    let minLen = 0.02;
    let maxLen = minLen * 5;
    let last = 0;
    while (last < 1 && densityBands.length < 80) {
        let len = constrain(random(minLen, maxLen), 0, 1 - last);
        let sw = random(0.1, 2) + swSlider;
        let sp = random(0.3, 1) + spSlider;
        // let sw = swSlider;
        // let sp = spSlider;
        let alphaStyle = floor(random(3));
        densityBands.push([last, last + len, sw, sp, alphaStyle]);
        last += len;
    }
}










function getRotateSpeed(speed) {
    if (speed < 0.5) return 0.005;
    else if (speed < 1.5) return 0.013;
    else if (speed < 3.3) return 0.021;
    else if (speed < 5.5) return 0.029;
    else if (speed < 7.9) return 0.037;
    else if (speed < 10.7) return 0.045;
    else if (speed < 13.8) return 0.053;
    else if (speed < 17.1) return 0.061;
    else if (speed < 20.7) return 0.069;
    else if (speed < 24.4) return 0.077;
    else if (speed < 28.4) return 0.085;
    else if (speed < 32.6) return 0.093;
    else return 0.1;
}

function drawHorizontalLines(pg, cx, cy, w, h) {
    let startY = cy - h / 2;
    let step = h / totalLinesGrid;
    
    // pg.blendMode(BLEND);
    // pg.image(noiseTexture, 0, 0, pg.width, pg.height);
    
    for (let i = 0; i < totalLinesGrid; i++) {
        let y = startY + i * step;
        let thick = lineThicknesses[i] || 1;
        
        // pg.stroke(window.chosenColorGroup[Math.floor(Math.random() * window.chosenColorGroup.length)]);
        let color = window.layerColors[4] || "#cccccc";
        pg.stroke(color);
        // let palette = window.chosenColorGroup;
        // if (!palette || palette.length === 0) {
        //   console.warn("palette가 비어있음!");
        //   return;
        // }
        // let c1 = pg.color(palette[0]);
        // let c2 = pg.color(palette[palette.length - 1]);
        // let t = i / (totalLines - 1);
        // pg.stroke(lerpColor(c1, c2, t));
        
        pg.strokeWeight(thick);
        pg.line(cx - w / 2, y, cx + w / 2, y);
        pg.blendMode(BLEND);
    }
}

function fluctuateAndNormalize(arr, total, offsetArray, amp = 25, speed = 0.05) {
    let minSize = total / arr.length * 0.4;
    for (let i = 0; i < arr.length; i++) {
        let wave = sin(frameCount * speed + offsetArray[i]) * amp;
        arr[i] = lerp(arr[i], arr[i] + wave, 0.1);
        arr[i] = max(arr[i], minSize);
    }
    let sum = arr.reduce((a, b) => a + b, 0);
    let scale = total / sum;
    for (let i = 0; i < arr.length; i++) {
        arr[i] *= scale;
    }
}

function drawMovingLines(pg, cx, cy, w, h) {
    let vibrationRange = h * 0.4;
    for (let i = 0; i < totalLines; i++) {
        let baseY = cy + sin(frameCount * 0.0005 + i) * vibrationRange;
        let windEffect = sin(i + frameCount * (0.002 + abs(vComponent) * 0.01)) * vComponent;
        let finalY = baseY + windEffect;
        
        let thickness = lineThicknesses[i] || 1;
        let color = window.layerColors[5] || "#cccccc";
        pg.stroke(color);
        pg.strokeWeight(thickness * 0.09);
        pg.line(cx - w / 2, finalY, cx + w / 2, finalY);
    }
}

function drawPatternLines(pg, w, h, rectIndex) {
    if (!pg || typeof pg.strokeWeight !== "function") {
        console.error("drawPatternLines: pg가 p5.Graphics 객체가 아님!", pg);
        throw new Error("drawPatternLines: pg가 p5.Graphics 객체가 아님!");
    }
    
    if (!colSet || colSet.length < 3) {
        let palette = window.chosenColorGroup;
        colSet = [
            [pg.color(palette[0]), pg.color(palette[1 % palette.length])],
            [pg.color(palette[1 % palette.length]), pg.color(palette[2 % palette.length])],
            [pg.color(palette[2 % palette.length]), pg.color(palette[0])]
        ];
    }
    
    for (let i = 0; i < densityBands.length; i++) {
        let band = densityBands[i];
        let bandStartY = band[0] * h - h / 2;
        let bandEndY = band[1] * h - h / 2;
        let bandStrokeW = band[2];
        let bandSpacing = band[3];
        let alphaStyle = band[4];
        
        //rectIndex에 따라 색상쌍을 선택 
        let segmentIndex = i % colSet.length;
        let col1 = colSet[segmentIndex][0];
        let col2 = colSet[segmentIndex][1];
        
        for (let y = bandStartY; y < bandEndY; y += bandSpacing) {
            let localRatio = map(y, bandStartY, bandEndY, 0, 1);
            
            //color lerp segment (3 options)
            let brightnessRatio;
            if (alphaStyle === 0) {
                brightnessRatio = abs(0.5 - localRatio) * 2;
            } else if (alphaStyle === 1) {
                brightnessRatio = 1 - abs(0.5 - localRatio) * 2;
            } else {
                brightnessRatio = localRatio * 0.8;
            }
            
            let alphaSegment = lerp(alphaMin, alphaMax, brightnessRatio);
            pg.strokeWeight(bandStrokeW);
            let col = lerpColor(col1, col2, brightnessRatio); 
            col. setAlpha(alphaSegment);
            pg.stroke(col);
            // pg.line(-w / 2, y, w / 2, y);
            
            // ★ rect 영역 내에만 선을 그림 (clip 대신)
            if (y >= -h / 2 && y <= h / 2) {
                pg.line(-w / 2, y, w / 2, y);
            }
            
            pg.blendMode(BLEND);
        }
    }
}





function layer1Lines(pg, cx, cy, h, vComponent) {
    // // console.log("📍 layer1Lines called on frame: " + frameCount);
    // console.trace("👣 layer1Lines trace");
    // console.log("🔹 layer1Lines called");
    
    pg.clear();
    pg.push();
    
    // pg.blendMode(BLEND);
    
    // cx1 = Number(cx1);       
    // cy1 = Number(cy1);
    // h1 = Number(h1);
    // vComponent = Number(vComponent);
    
    let vibrationRange = h;
    let w = pg.width;
    let color = window.layerColors[1] || "#cccccc";
    
    for (let i = 0; i < totalLines; i++) {
        let centerY = cy;
        let baseY = centerY + sin(frameCount * 0.0005 + i) * vibrationRange;

        let phase = i * 0.5;
        //let windEffect = sin(i + frameCount * 0.05) * vComponent;
        let windEffect = sin(phase + i + frameCount * (0.01 + Math.abs(vComponent) * 0.01));//진폭뿐아니라 속도에도 반영
        let finalY = baseY + windEffect;
        let lineThickness = lineThicknesses[i] || 1;
    
        // // console.log("background[0]:", finalColors.background[0]);
        // // console.log("background[1]:", finalColors.background[1]);
        // // console.log("background[2]:", finalColors.background[2]);
        pg.stroke(color);
        pg.strokeWeight(lineThickness);
        // // console.log("cx:", cx, typeof cx);
        // // console.log("w:", w, typeof w);
        // // console.log("finalY:", finalY, typeof finalY);
    
        pg.line(cx - w / 2, finalY, cx + w / 2, finalY);
    }
    
      pg.pop();
    }



function layer2Lines(pg, cx, cy, w, h, uComponent) {
    // // console.log("📍 layer12Lines called on frame: " + frameCount);
    // console.log("🔹 layer2Lines called");
  
    pg.clear();
    pg.push();
  
    let vibrationRange = w;
  
    for (let i = 0; i < totalLines; i++) {
      let centerX = cx;
      let baseX = centerX + sin(frameCount * 0.0009 + i) * vibrationRange;
      
      let phase = i * 0.5;
      // let windEffect = sin(i + frameCount * 0.02) * uComponent; 
      let windEffect = sin(phase + i + frameCount * (0.01 + Math.abs(uComponent) * 0.01));//진폭뿐아니라 속도에도 반영
      let finalX = baseX + windEffect;
  
      let lineThickness = lineThicknesses[i] || 1;
      // pg.stroke(0, 200, 0); // 초록
      let color = window.layerColors[2] || "#cccccc";
      pg.stroke(color);
      pg.strokeWeight(lineThickness * 1.2);
      // pg.line(finalX, cy - h / 2, finalX, cy + h / 2); // 수직선
      pg.line(Number(finalX), Number(cy - h / 2), Number(finalX), Number(cy + h / 2));
  }
    pg.pop();
  }

function layer3Bars(pg) {
    // // console.log("📍 layer3Bars called on frame: " + frameCount);
    
    // console.log("🔹 layer3Bars called");
    
    pg.clear();
    for (let b of windBars) {
        pg.push();
        pg.blendMode(OVERLAY);
        pg.translate(b.x, b.y);
        for (let i = 0; i < 3; i++) {
            let opacities = [255, 150, 50];
            // pg.fill(0, opacities[i]);
            // pg.fill(0, 0, 255, opacities[i]); // 파랑
            let color = window.layerColors[3] || "#cccccc";
            pg.fill(color);
            pg.noStroke();
            for (let j = 0; j < 3; j++) {
                pg.push();
                pg.rotate(radians(windDeg * j) + angleOffset * (i / 4));
                pg.rect(0, 0, 100, 2);
                pg.pop();
            }
        }
        pg.pop();
    }
}


function layer4Grid1(pg) {
    pg. clear();
    // // console.log("📍 layer4Grid1 called on frame: " + frameCount);
    
    // console.log("🔹 layer4Grid1 called");
    if (windSpeed === 0 || temperature === 0) return;
    
    let ampByVariance = map(variance, 0, 5, 0, 120);
    ampByVariance = max(ampByVariance, 5);
    fluctuateAndNormalize(colSizes1, pg.width, colOffsets1, ampByVariance, 0.01);
    fluctuateAndNormalize(rowSizes1, pg.height, rowOffsets1, ampByVariance, 0.01);
    
    let y = 0;
    for (let j = 0; j < rows; j++) {
        let x = 0;
        for (let i = 0; i < cols; i++) {
            const MIN_TEMP = -5;
            const MAX_TEMP = 40;
            const MIN_ELLIPSE = 5;
            
            const w = colSizes1[i];
            const h = rowSizes1[j];
            const cx = x + w / 2;
            const cy = y + h / 2;
            
            const ellipseW = map(temperature, MIN_TEMP, MAX_TEMP, MIN_ELLIPSE, w);
            const ellipseH = map(temperature, MIN_TEMP, MAX_TEMP, MIN_ELLIPSE, h);
            
            // 💠 내부 수평선
            // pg.push();
            // drawHorizontalLines(pg, cx, cy, w, h);
            // pg.pop();
            
            // // 🕳️ 타일 중심 마스킹
            // pg.push();
            // pg.erase();
            // pg.noStroke();
            // pg.fill(255);
            // pg.ellipse(cx, cy, ellipseW, ellipseH);
            // pg.noErase();
            // // pg.blendMode(BLEND);
            // pg.pop();
            
            pg.push();
            pg.drawingContext.save();
            pg.drawingContext.beginPath();
            pg.drawingContext.rect(x,y,w,h);
            pg.drawingContext.ellipse(cx, cy, ellipseW / 2, ellipseH / 2,0, 0, Math.PI * 2);
            pg.drawingContext.clip('evenodd');
            
            drawHorizontalLines(pg, cx, cy, w,h);
            // drawMovingLines(pg, cx, cy, w,h);
            
            pg.drawingContext.restore();
            pg.pop();
            
            x += w;
        }
        y += rowSizes1[j];
    }
}

function layer5Grid2(pg) {
    // // console.log("📍 layer5Grid2 called on frame: " + frameCount);
    pg.clear() ;
    
    if (!colSizes2 || colSizes2.length === 0) {
        console.warn("❗ initializeGrid2() 안 불렀어! 먼저 불러야 해!");
        return;
    }
    // console.log("🔹 layer5Grid2 called");
    if (windSpeed === 0 || temperature === 0) return;
    
    let ampByVariance = map(variance, 0, 5, 0, 120);
    ampByVariance = max(ampByVariance, 5);
    fluctuateAndNormalize(colSizes2, pg.width, colOffsets2, ampByVariance, 0.01);
    fluctuateAndNormalize(rowSizes2, pg.height, rowOffsets2, ampByVariance, 0.01);
    
    let y = 0;
    for (let j = 0; j < rows; j++) {
        let x = 0;
        for (let i = 0; i < cols; i++) {
            const MIN_TEMP = -5;
            const MAX_TEMP = 40;
            const MIN_ELLIPSE = 5;
            
            const w = colSizes2[i];
            const h = rowSizes2[j];
            const cx = x + w / 2;
            const cy = y + h / 2;
            
            
            const ellipseW = map(temperature, MIN_TEMP, MAX_TEMP, MIN_ELLIPSE, w);
            // // console.log("🔴:", w, typeof w)
            const ellipseH = map(temperature, MIN_TEMP, MAX_TEMP, MIN_ELLIPSE, h);
            
            // Clip 방식 마스킹
            pg.push();
            pg.drawingContext.save();
            pg.drawingContext.beginPath();
            pg.drawingContext.ellipse(cx, cy, ellipseW / 2, ellipseH / 2, 0, 0, Math.PI * 2);
            pg.drawingContext.clip();
            
            // 내부 수평선 (움직이는)
            drawMovingLines(pg, cx, cy, ellipseW, ellipseH);
            
            pg.drawingContext.restore();
            pg.pop();
            
            x += w;
        }
        y += rowSizes2[j];
    }
}

function getColor(idx) {
    let palette = window.chosenColorGroup;
    if (!palette || palette.length === 0) {
        // fallback: 회색 반환
        return "#cccccc";
    }
    return palette[idx % palette.length];
}
function layer6Pattern(pg) {
    // // console.log("📍 layer6Pattern called on frame: " + frameCount);
    
    pg.clear(); 
    
    // console.log("🔹 layer6Pattern called");
    rectWidth = constrain(variance * 100, 20, 550);
    rectOffset = rectWidth * 0.9;  
    
    let mainColor = window.layerColors[6] || "#cccccc";
    let palette = window.chosenColorGroup || [];
    let subColor = palette.find(c => c !== mainColor) || "#cccccc";
    colSet = [
        [pg.color(mainColor), pg.color(subColor)],
        [pg.color(mainColor), pg.color(subColor)],
        [pg.color(mainColor), pg.color(subColor)]
    ];
    
    if (densityBands.length === 0) initializeDensityBands();
    
    rectHeight = pg.height;
    
    for (let i = 0; i < rectCount; i++) {
        let cx = pg.width / 2 - ((rectCount - 1) * rectOffset) / 2 + i * rectOffset;
        let cy = pg.height / 2 + sin(i * 0.5) * twist;
        
        // pg.push();
        // pg.blendMode(BLEND);
        // pg.translate(cx, cy);
        // pg.rectMode(pg.CENTER);
        // pg.noStroke();
        // let clipMarginY = 200;
        // pg.drawingContext.save();
        // pg.rect(0, 0, rectWidth, rectHeight + clipMarginY * 2);
        // pg.drawingContext.clip();
        // drawPatternLines(pg, rectWidth, rectHeight, i);
        // pg.drawingContext.restore();
        // pg.pop();
        pg.push();
        pg.blendMode(BLEND);
        pg.translate(cx, cy);
        pg.rectMode(pg.CENTER);
        pg.noStroke();
        // ★ clip 관련 코드 완전히 제거!
        drawPatternLines(pg, rectWidth, rectHeight, i);
        pg.pop();
    }
}


document.addEventListener("DOMContentLoaded", function() {
   
    const liveBlock = document.getElementById("liveBlock");
    if (!liveBlock) return;
  
    liveBlock.addEventListener("dblclick", function() {
        console.log("double works");
      html2canvas(liveBlock, {
        backgroundColor: null,
        useCORS: true
      }).then(function(canvas) {
        const imgData = canvas.toDataURL("image/png");
  
        // 프린트용 iframe 생성
        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.right = '100vw';
        printFrame.style.width = '1px';
        printFrame.style.height = '1px';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);
  
        printFrame.onload = function() {
          const doc = printFrame.contentWindow.document;
          doc.open();
          doc.write(`
            <html>
              <head>
                <title>Print LiveBlock</title>
                <style>
                  body { margin: 0; text-align: center; }
                  img { max-width: 100vw; max-height: 100vh; }
                </style>
              </head>
              <body>
                <img src="${imgData}" onload="window.print();">
              </body>
            </html>
          `);
          doc.close();
        };
  
        printFrame.contentWindow.onafterprint = function() {
          document.body.removeChild(printFrame);
        };
      });
    });
  });