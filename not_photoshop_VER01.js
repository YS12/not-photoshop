/* 자바스크립트 미니프로젝트 : 영상 처리

NOTE 3차원 배열 traverse 함수를 따로 만들어 사용하는 버전 */

// 전역 변수(*중요*)
var mainCanvas, mainCtx;  // 입출력 캔버스와 해당 콘텍스
var inImageArray, outImageArray;  // 입출력 이미지 배열, 임시 저장 이미지 배열
var inWidth, inHeight, outWidth, outHeight;  // 입출력 이미지 크기
var mainPaper; // 입출력 이미지 (화면 출력용)
var inFile, srcImage;   // 사용자 선택 이미지 파일
var dynSliderTD, dynLbl;  //슬라이드바를 넣는 공간
var layerImgArr, doDblExp;  //double exposure 관련

//전역 변수: 화소 영역 처리에 쓰는 마스크들
//마스크 전역 변수 (바꾸지 않는 변수들)
var EMBOSS_MASK =
    [[-1., 0., 0.],
    [0., 0., 0.],
    [0., 0., 1.]];
var BLUR_MASK =
    [[1 / 9., 1 / 9., 1 / 9.],
    [1 / 9., 1 / 9., 1 / 9.],
    [1 / 9., 1 / 9., 1 / 9.]];
var SHARP1_MASK =
    [[-1., -1., -1.],
    [-1., 9., -1.],
    [-1., -1., -1.]];
var SHARP2_MASK =
    [[0, -1., 0],
    [-1., 5., -1.],
    [0, -1., 0]];
var SMOOTHGAUSS_MASK =
    [[1 / 16., 1 / 8., 1 / 16.],
    [1 / 8., 1 / 4., 1 / 8.],
    [1 / 16., 1 / 8., 1 / 16.]];
var LAPLACE_EDG_MASK =
    [[1., 1., 1.],
    [1., -8., 1.],
    [1., 1., 1.]];
//뒤에 _P가 붙는 것들은 에지 검출용 [수평, 수직] 마스크 쌍
var SHIFTDIFF_MASK_P =
    [[[0., -1., 0.],
    [0., 1., 0.],
    [0., 0., 0.]],
    [[0., 0., 0.],
    [-1., 1., 0.],
    [0., 0., 0.]]];
var ROBERTS_MASK_P =
    [[[-1., 0., 0.],
    [0., 1., 0.],
    [0., 0., 0.]],
    [[0., 0., -1.],
    [0., 1., 0.],
    [0., 0., 0.]]];
var PREWITT_MASK_P =
    [[[-1., -1., -1],
    [0., 0., 0.],
    [1., 1., 1.]],
    [[1., 0., -1.],
    [1., 0., -1.],
    [1., 0., -1.]]];
var SOBEL_MASK_P =
    [[[-1., -2., -1.],
    [0., 0., 0.],
    [1., 2., 1.]],
    [[1., 0., -1.],
    [2., 1., -2.],
    [1., 0., -1.]]];
//3x3보다 큰 마스크들
var LOG_MASK_5 =
    [[0., 0., -1., 0., 0.],
    [0., -1., -2., -1., 0.],
    [-1., -2., 16., -2., -1.],
    [0., -1., -2., -1., 0.],
    [0., 0., -1., 0., 0.]];
var DOG_MASK_7 =
    [[0., 0., -1., -1., -1., 0., 0.],
    [0., -2., -3., -3., -3., -2., 0.],
    [-1., -3., 5., 5., 5., -3., -1.],
    [-1., -3., 5., 16., 5., 5., -3., -1.],
    [-1., -3., 5., 5., 5., -3., -1.],
    [0., -2., -3., -3., -3., -2., 0.],
    [0., 0., -1., -1., -1., 0., 0.]];
var DOG_MASK_9 =
    [[0., 0., 0., -1., -1., -1., 0., 0., 0.],
    [0., -2., -3., -3., -3., -3., -3., -2., 0.],
    [0., -3., -2., -1., -1., -1., -2., -3., 0.],
    [-1., -3., -1., 9., 9., 9., -1., -3., -1.],
    [-1., -3., -1., 9., 19., 9., -1., -3., -1.],
    [-1., -3., -1., 9., 9., 9., -1., -3., -1.],
    [0., -3., -2., -1., -1., -1., -2., -3., 0.],
    [0., -2., -3., -3., -3., -3., -3., -2., 0.],
    [0., 0., 0., -1., -1., -1., 0., 0., 0.]];

/* 페이지 로딩될 때 초기화 */
function init() {
    mainCanvas = document.getElementById('mainCanvas');
    mainCtx = mainCanvas.getContext('2d');
    dynSliderTD = document.getElementById("dynSliderTD");
    dynLbl = document.getElementById("dynLbl");
    inFile = document.getElementById("selectFile");
    srcImage = new Image();
    doDblExp = false;

    //이미지 파일이 선택된 후 벌어지는 일들
    srcImage.onload = function () {         //srcImage에 이미지 파일이 지정되면
        mainCanvas.width = inWidth = srcImage.width;
        mainCanvas.height = inHeight = srcImage.height;
        mainCtx.drawImage(srcImage, 0, 0, inWidth, inHeight);   //출력하고
        inImageArray = new Array(4);        //입력 이미지 배열 생성
        for (var rgb = 0; rgb < 4; rgb++) {
            inImageArray[rgb] = new Array(inHeight);
            for (var i = 0; i < inHeight; i++) {
                inImageArray[rgb][i] = new Array(inWidth);
            }
        }
        //출력된 캔버스에서 픽셀값 뽑아서 입력 배열에 삽입
        let imgData = mainCtx.getImageData(0, 0, inWidth, inHeight);
        let R, G, B, alpha;
        for (var i = 0; i < inHeight; i++) {
            for (var k = 0; k < inWidth; k++) {
                let px = (i * inWidth + k) * 4;
                R = imgData.data[px + 0];
                G = imgData.data[px + 1];
                B = imgData.data[px + 2];
                alpha = imgData.data[px + 3];
                inImageArray[0][i][k] = R;
                inImageArray[1][i][k] = G;
                inImageArray[2][i][k] = B;
                inImageArray[3][i][k] = alpha;
            }
        }
    }

    //사용자가 이미지 파일을 선택할때마다
    inFile.onchange = function (e) {
        let file = e.target.files[0];
        //선택된 파일의 연장자에 따라 이미지 받는 함수 골라 부르기
        if (file.type.match(/raw/i))
            loadRAWImg(file);
        else {
            srcImage.src = URL.createObjectURL(file);  //URL로 만들면 폴더 밖의 파일도 사용 가능
            URL.revokeObjectURL(file);
        }
        resetEditor();
    }
}

/* 캔버스 외의 에디터 관련 화면 정리 함수 */
function resetEditor() {
    // 동적으로 생성된 슬라이드바와 라벨 제거
    if (document.getElementById("slider") != null) {
        dynSliderTD.removeChild(document.getElementById("slider"));
        dynLbl.innerHTML = "";
    }
    // 고정 슬라이드바 값 초기화
    document.getElementById("brgtSlider").value = 0;
    document.getElementById("contrastSlider").value = 0;
    document.getElementById("transpSlider").value = 0;
    document.getElementById("adjRSlider").value = 0;
    document.getElementById("adjGSlider").value = 0;
    document.getElementById("adjBSlider").value = 0;
    // 선택메뉴 값 초기화
    document.getElementById("histForm").value = 0;
    document.getElementById("areaForm").value = 0;
    document.getElementById("edgeDetForm").value = 0;
    // doDbExp 초기화
    doDblExp = false;
}

/* RAW 형식의 이미지를 읽어들여 3차원 배열에 저장
일단은 돌아가게 하려고 모든 픽셀을 같은 값으로 3차원 배열에 저장하고 있는데
이거 정말 효율 나쁜 방법임;; */
function loadRAWImg(file) {
    inWidth = inHeight = Math.sqrt(file.size);
    //입력용 3차원 배열 준비
    inImageArray = new Array(4);
    for (var i = 0; i < 4; i++) {
        inImageArray[i] = new Array(inHeight);
        for (var k = 0; k < inHeight; k++) {
            inImageArray[i][k] = new Array(inWidth);
        }
    }
    //raw 파일을 위에 만든 2차원 배열로 읽어들인다
    var reader = new FileReader();
    reader.readAsBinaryString(file);
    reader.onload = function () {
        var bin = reader.result;    //파일을 덩어리로 읽었음
        //통째로 저장한 bin에서 한 픽셀씩 3차원 배열에 넣기
        let start, end, pix;
        for (var i = 0; i < inHeight; i++) {
            for (var k = 0; k < inWidth; k++) {
                start = i * inHeight + k;
                end = (i * inHeight + k) + 1;
                pix = bin.slice(start, end);
                inImageArray[0][i][k] = pix.charCodeAt(0);
                inImageArray[1][i][k] = pix.charCodeAt(0);
                inImageArray[2][i][k] = pix.charCodeAt(0);
                inImageArray[3][i][k] = 255;        //즉 rgba 형태의 그레이스케일 이미지로 만듬
            }
        }
        //읽은 이미지를 inCanvas로 출력
        mainCanvas.height = inHeight;
        mainCanvas.width = inWidth;
        mainPaper = mainCtx.createImageData(inHeight, inWidth);
        traverseImgArr(function (rgb, i, k) {
            mainPaper.data[(i * inWidth + k) * 4 + rgb] = inImageArray[rgb][i][k];
        }, inHeight, inWidth);
        mainCtx.putImageData(mainPaper, 0, 0);
    }
}

/* 이미지 출력 */
function displayImage() {
    // 캔버스 크기를 결정
    mainCanvas.width = outWidth;
    mainCanvas.height = outHeight;
    mainPaper = mainCtx.createImageData(outWidth, outHeight); //종이 붙였음.
    traverseImgArr(function (rgb, i, k) {
        mainPaper.data[(i * outWidth + k) * 4 + rgb] = outImageArray[rgb][i][k];
    }, outHeight, outWidth);
    mainCtx.putImageData(mainPaper, 0, 0);
}

/* 이미지를 blob로 변환해서 다운받기 */
function downloadImg() {
    // 캔버스에서 blob 생성
    mainCanvas.toBlob(function (blob) {
        // url 생성해서 다운로드
        let link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'image.png';

        link.click();

        // 메모리 놔주기
        URL.revokeObjectURL(link.href);
    }, 'image/png');
}

/* 변화 저장하기 (누적) */
function saveChange() {
    // 입력과 출력 배열의 크기가 다르면 출력 배열의 크기에 맞춰 새로운 입력 배열 생성
    inHeight = outHeight; inWidth = outWidth;
    inImageArray = new Array(4);
    for (var rgb = 0; rgb < 4; rgb++) {
        inImageArray[rgb] = new Array(inHeight);
        for (var i = 0; i < inHeight; i++) {
            inImageArray[rgb][i] = new Array(inWidth);
        }
    }
    // 출력 배열의 데이터를 입력 배열로 옮기기
    traverseImgArr(function (rgb, i, k) {
        inImageArray[rgb][i][k] = outImageArray[rgb][i][k];
    }, inHeight, inWidth);
    // for (rgb = 0; rgb < 4; rgb++) {
    //     for (var i = 0; i < inHeight; i++) {
    //         inImageArray[rgb][i] = outImageArray[rgb][i].slice();
    //     }
    // }
    //저장한 이미지를 mainCanvas로 출력
    mainCanvas.height = inHeight;
    mainCanvas.width = inWidth;
    mainPaper = mainCtx.createImageData(inWidth, inHeight);
    traverseImgArr(function (rgb, i, k) {
        mainPaper.data[(i * inWidth + k) * 4 + rgb] = inImageArray[rgb][i][k];
    }, inHeight, inWidth);
    mainCtx.putImageData(mainPaper, 0, 0);
}

/* 변화 취소하기 */
function discardChange() {
    // 그냥 displayImage()를 inImageArray 주축으로 돌렸음
    mainCanvas.width = inWidth;
    mainCanvas.height = inHeight;
    mainPaper = mainCtx.createImageData(inWidth, inHeight); //종이 붙였음.
    traverseImgArr(function (rgb, i, k) {
        mainPaper.data[(i * inWidth + k) * 4 + rgb] = inImageArray[rgb][i][k];
    }, inHeight, inWidth);
    mainCtx.putImageData(mainPaper, 0, 0);
}

/* 처음으로 되돌리기 */
function resetToOrg() {
    // init 할때처럼 파일에서 이미지 아예 불러오는 것으로...
    let file = inFile.files[0];
    if (file.name.endsWith("raw"))
        loadRAWImg(file);
    else
        srcImage.src = URL.createObjectURL(file);  //URL로 만들면 폴더 밖의 파일도 사용 가능
    URL.revokeObjectURL(file);
    resetEditor();
}

/* 입력 받은 크기의 3차원 rgba 출력 배열 생성 */
function decOutVars(inScale) {
    if (inScale == NaN || inScale == null)
        inScale = 1;
    //알고리즘에 따라 출력영상 크기 결정
    outHeight = parseInt(inHeight * inScale);
    outWidth = parseInt(inWidth * inScale);
    //출력 이미지 배열 초기화
    outImageArray = new Array(4);
    for (var i = 0; i < 4; i++) {
        outImageArray[i] = new Array(outHeight);
        for (var k = 0; k < outHeight; k++) {
            outImageArray[i][k] = new Array(outWidth);
        }
    }
}

/* 입력 받은 크기의 4차원 출력 배열 생성 */
function decOutVars2(wd, ht) {
    outHeight = ht;
    outWidth = wd;
    //출력 이미지 배열 초기화
    outImageArray = new Array(4);
    for (var i = 0; i < 4; i++) {
        outImageArray[i] = new Array(outHeight);
        for (var k = 0; k < outHeight; k++) {
            outImageArray[i][k] = new Array(outWidth);
        }
    }
}

/* 슬라이드바 동적 생성. 입력받은 변수로 슬라이드바 생성. */
function createSlider(minSlide, maxSlide, valSlide, stepSlide) {
    let slider = document.createElement("input");
    slider.id = "slider";
    slider.type = "range";
    slider.min = minSlide;
    slider.max = maxSlide;
    slider.value = valSlide;
    slider.step = stepSlide;
    dynSliderTD.appendChild(slider);
}

/* 오버플로우 체크하고 필요히면 픽셀 값 조정 */
function checkOverflow(pix) {
    if (pix < 0)
        pix = 0;
    else if (pix > 255)
        pix = 255;

    return pix;
}

/* 3차원 rgba 이미지 배열을 트라버스하며 입력받은 함수를 각 픽셀에 적용한다 */
function traverseImgArr(processFun, imgH, imgW) {
    // let imgH = inHeight; let imgW = inWidth;
    // if (inHeight < outHeight) {
    //     imgH = outHeight; imgW = outWidth;
    // }

    for (rgb = 0; rgb < 4; rgb++) {
        for (var i = 0; i < imgH; i++) {
            for (var k = 0; k < imgW; k++) {
                processFun(rgb, i, k);
            }
        }
    }
}

/* 입력받은 크기의 블러링 마스크를 생성해서 리턴한다 */
function makeKernel(kernelSize) {
    //마스크 배열 생성
    let kernel = new Array(kernelSize);
    for (var i = 0; i < kernelSize; i++)
        kernel[i] = new Array(kernelSize);
    //마스크 배열에 1/칸수 값 삽입
    for (var i = 0; i < kernelSize; i++) {
        kernel[i].fill(1 / (kernelSize * kernelSize));  //Javascript Array.fill() 참조
    }
    return kernel;
}

/* 히스토그램 계열 함수를 지정받으면 실행 */
function selHist(selectNum) {
    // // 화면 정리
    // if (document.getElementById("slider") != null) {
    //     dynSliderTD.removeChild(document.getElementById("slider"));
    //     dynLbl.innerHTML = "";
    // }

    switch (parseInt(selectNum)) {
        case 11:    // 히스토그램 스트레칭
            doHistStretch();
            break;
        case 12:    // 엔드-인 탐색
            doEndIn();
            break;
        case 13:    // 히스토그램 평활화
            doHistEqualize();
            break;
    }
}

/* 화소 영역 처리 계열 함수 지정받으면 실행 */
function selArea(selectNum) {
    switch (parseInt(selectNum)) {
        case 21:    // 엠보싱
            processKernelImg(EMBOSS_MASK, 1);
            break;
        case 22:    // 사용자 크기 지정 블러
            var blurKernel = makeKernel(parseInt(prompt("블러링 마스크 크기 (홀수)", "3")));
            processKernelImg(blurKernel, 0);
            break;
        case 23:    // 샤프닝 1
            processKernelImg(SHARP1_MASK, 0);
            break;
        case 24:    // 샤프닝 2
            processKernelImg(SHARP2_MASK, 0);
            break;
        case 25:    // 가우시안 스무딩
            processKernelImg(SMOOTHGAUSS_MASK, 0);
            break;
    }
}

/* 에지 검출 함수 지정받으면 실행 */
function selEdgeDet(selectNum) {
    switch (parseInt(selectNum)) {
        case 31:  // 에지 검출 (이동과 차분)
            detectEdge(SHIFTDIFF_MASK_P, 0);    //후처리???
            break;
        case 32:  // 에지 검출 (로버츠)
            detectEdge(ROBERTS_MASK_P, 0);
            break;
        case 33:  // 에지 검출 (프리윗)
            detectEdge(PREWITT_MASK_P, 0);
            break;
        case 34:  // 에지 검출 (소벨)
            detectEdge(SOBEL_MASK_P, 0);
            break;
        case 35:  // 에지 검출 (라플라시안)
            processKernelImg(LAPLACE_EDG_MASK, 0);
            break;
        case 36:  // LoG 5x5
            processKernelImg(LOG_MASK_5, 0);
            break;
        case 37:  // DoG 7x7
            processKernelImg(DOG_MASK_7, 0);
            break;
        case 38:  // DoG 9x9
            processKernelImg(DOG_MASK_9, 0);
            break;
    }
}

/*** */
/************************************** 영상 처리 함수들 ******************************/
/*** */

/* 동일 이미지 출력 */
function equalImage() {
    decOutVars();
    //영상처리 알고리즘
    traverseImgArr(function (rgb, i, k) {
        outImageArray[rgb][i][k] = inImageArray[rgb][i][k];
    }, inHeight, inWidth);
    displayImage();
}

/* 그레이스케일 */
function toGrayscale() {
    decOutVars();
    var R, G, B;
    for (var i = 0; i < inHeight; i++) {
        for (var k = 0; k < inWidth; k++) {
            R = inImageArray[0][i][k];
            G = inImageArray[1][i][k];
            B = inImageArray[2][i][k];

            var RGB = parseInt((R + G + B) / 3);

            outImageArray[0][i][k] = RGB;
            outImageArray[1][i][k] = RGB;
            outImageArray[2][i][k] = RGB;
            outImageArray[3][i][k] = inImageArray[3][i][k];

        }
    }
    displayImage();
}

/* 보완한 그레이스케일 */
function toGrayscaleWeighted() {
    decOutVars();
    let R, G, B;
    for (var i = 0; i < inHeight; i++) {
        for (var k = 0; k < inWidth; k++) {
            R = inImageArray[0][i][k];
            G = inImageArray[1][i][k];
            B = inImageArray[2][i][k];

            var RGB = checkOverflow(parseInt(0.299 * R + 0.587 * G + 0.114 * B));

            outImageArray[0][i][k] = RGB;
            outImageArray[1][i][k] = RGB;
            outImageArray[2][i][k] = RGB;
            outImageArray[3][i][k] = inImageArray[3][i][k];
        }
    }
    displayImage();
}

/* 이미지 반전 */
function toNegative() {
    decOutVars();
    traverseImgArr(function (rgb, i, k) {
        if (rgb == 3)
            outImageArray[3][i][k] = inImageArray[rgb][i][k];
        else
            outImageArray[rgb][i][k] = 255 - inImageArray[rgb][i][k];
    }, inHeight, inWidth);
    displayImage();
}

/* 세피아 톤. 알고리즘은 MS라고 소문이 돌지만 알 수 없는 온라인. */
function toSepia() {
    decOutVars();
    let R, G, B;
    // R' = R * 0.393 + G * 0.769 + B * 0.189
    // G' = R * 0.349 + G * 0.686 + B * 0.168
    // B' = R * 0.272 + G * 0.534 + B * 0.131
    for (var i = 0; i < inHeight; i++) {
        for (var k = 0; k < inWidth; k++) {
            R = inImageArray[0][i][k];
            G = inImageArray[1][i][k];
            B = inImageArray[2][i][k];
            outImageArray[0][i][k] = checkOverflow(parseInt(0.393 * R + 0.769 * G + 0.189 * B));
            outImageArray[1][i][k] = checkOverflow(parseInt(0.349 * R + 0.686 * G + 0.168 * B));
            outImageArray[2][i][k] = checkOverflow(parseInt(0.272 * R + 0.534 * G + 0.131 * B));
            outImageArray[3][i][k] = inImageArray[3][i][k];
        }
    }
    displayImage();
}

/* 흑백 처리. 컬러 영상의 경우에는 그레이스케일로 계산한 후 변환 */
function toBW(inVal) {
    // 다른 작업으로 생성된 슬라이드바 있으면 제거
    if (dynLbl.innerHTML != "흑백 비율") {
        if (document.getElementById("slider") != null) {
            dynSliderTD.removeChild(document.getElementById("slider"));
            dynLbl.innerHTML = "";
        }
        createSlider(0, 255, 128, 10);
        dynLbl.innerHTML = "흑백 비율";
        document.getElementById("slider").addEventListener("change", function () { toBW(parseInt(this.value)) });
    }

    if (inVal == NaN || inVal == null)
        inVal = 128;

    decOutVars();  //출력 변수와 배열 초기화
    //영상처리 알고리즘
    let R, G, B, grayVal;
    for (var i = 0; i < inHeight; i++) {
        for (var k = 0; k < inWidth; k++) {
            R = inImageArray[0][i][k];
            G = inImageArray[1][i][k];
            B = inImageArray[2][i][k];
            grayVal = parseInt(0.299 * R + 0.587 * G + 0.114 * B);
            grayVal = (grayVal > inVal) ? 255 : 0;
            outImageArray[0][i][k] = grayVal;
            outImageArray[1][i][k] = grayVal;
            outImageArray[2][i][k] = grayVal;
            outImageArray[3][i][k] = inImageArray[3][i][k];
        }
    }
    displayImage();
}

/* 이미지 투명도 조절. 조절 정도를 슬라이드바로 입력받는다. */
function adjTransparency(inVal) {
    if (inVal == NaN || inVal == null)
        inVal = 0;

    decOutVars();
    traverseImgArr(function (rgb, i, k) {
        if (rgb == 3)
            outImageArray[3][i][k] = checkOverflow(inImageArray[3][i][k] + inVal);
        else
            outImageArray[rgb][i][k] = inImageArray[rgb][i][k];
    }, inHeight, inWidth);
    displayImage();
}

/* 밝기 조절 함수. 조절 정도를 슬라이드바로 입력받는다. */
function adjBrightness(inVal) {
    if (inVal == NaN || inVal == null)
        inVal = 0;

    decOutVars();  //출력 변수와 배열 초기화
    traverseImgArr(function (rgb, i, k) {
        if (rgb == 3)
            outImageArray[3][i][k] = inImageArray[3][i][k];
        else
            outImageArray[rgb][i][k] = checkOverflow(inImageArray[rgb][i][k] + inVal);
    }, inHeight, inWidth);
    displayImage();
}

/* 슬라이드바에서 입력받아 컨트래스트 조절 */
function adjContrast(inVal) {
    if (inVal == NaN || inVal == null)      //입력 변수 없으면 0이라고 치고
        inVal = 0;

    inVal = (259 * (inVal + 255)) / (255 * (259 - inVal));  //컨트래스트 팩터 계산

    decOutVars();
    traverseImgArr(function (rgb, i, k) {
        if (rgb == 3) {   //알파 채널은 원본 이미지 그대로 옮기고
            outImageArray[rgb][i][k] = inImageArray[rgb][i][k];
        } else {
            let pixel = inImageArray[rgb][i][k];
            outImageArray[rgb][i][k] = checkOverflow(parseInt(inVal * (pixel - 128) + 128));
        }
    }, inHeight, inWidth);
    displayImage();
}

/* 슬라이드바에서 입력받아 R, G, B 값 조절 */
function adjRGB(inVal, ch) {
    if (inVal == NaN || inVal == null)      //입력 변수 없으면 0이라고 치고
        inVal = 0;

    decOutVars();
    let channel;    //rgb 채널 설정
    if (ch.match(/r/i))
        channel = 0;
    else if (ch.match(/g/i))
        channel = 1;
    else
        channel = 2;
    traverseImgArr(function (rgb, i, k) {
        if (rgb == channel)
            outImageArray[rgb][i][k] = checkOverflow(inImageArray[rgb][i][k] + inVal);
        else
            outImageArray[rgb][i][k] = inImageArray[rgb][i][k];
    }, inHeight, inWidth);
    displayImage();
}

/* 슬라이드바에서 입력받은 2의 배수로 이미지 축소 */
function toDecrease(scale) {
    // 다른 작업으로 생성된 슬라이드바 있으면 제거
    if (dynLbl.innerHTML != "축소 배율") {
        if (document.getElementById("slider") != null) {
            dynSliderTD.removeChild(document.getElementById("slider"));
            dynLbl.innerHTML = "";
        }
        createSlider(0, 6, 0, 2);
        // 친절하게 라벨 생성
        dynLbl.innerHTML = "축소 배율";
        document.getElementById("slider").addEventListener("change", function () {
            toDecrease(parseInt(this.value));
        });
    }

    if (scale == NaN || scale == null || scale == 0)
        scale = 1;

    //영상처리 알고리즘
    decOutVars(1 / scale);
    try {
        traverseImgArr(function (rgb, i, k) {
            outImageArray[rgb][parseInt(i / scale)][parseInt(k / scale)] = inImageArray[rgb][i][k];
        }, inHeight, inWidth);
    } catch (TypeError) {
        alert("더 이상 축소할 수 없습니다.");
    }
    displayImage();
}

/* 슬라이드바에서 입력받은 2의 배수로 이미지 확대 */
function toIncrease(scale) {
    // 다른 작업으로 생성된 슬라이드바 있으면 제거
    if (dynLbl.innerHTML != "확대 배율") {
        if (document.getElementById("slider") != null) {
            dynSliderTD.removeChild(document.getElementById("slider"));
            dynLbl.innerHTML = "";
        }
        createSlider(0, 6, 0, 2);
        dynLbl.innerHTML = "확대 배율";
        document.getElementById("slider").addEventListener("change", function () {
            toIncrease(parseInt(this.value));
        });
    }

    if (scale == NaN || scale == null || scale == 0)
        scale = 1;

    //영상처리 알고리즘
    decOutVars(scale);
    traverseImgArr(function (rgb, i, k) {
        outImageArray[rgb][i][k] = inImageArray[rgb][parseInt(i / scale)][parseInt(k / scale)];
    }, outHeight, outWidth);
    displayImage();
}

/* 입력받은 각도만큼 이미지 반시계 방향으로 회전. 백워딩, 중심점, 출력 크기 보완. */
function toRotate() {
    let degree = parseFloat(prompt("회전 각도 (90도 이하)", 45));   //연산을 위해서 실수 처리
    //하지만 거의 모든 컴에서는 degree가 아닌 radian을 쓴다
    let radian = degree * Math.PI / 180.0 * -1;  //f(degree) -> radian
    //출력 영상의 크기
    let w = Math.ceil(inHeight * Math.sin(-radian) + inWidth * Math.cos(-radian))
    let h = Math.ceil(inHeight * Math.cos(-radian) + inWidth * Math.sin(-radian));
    decOutVars2(w, h);
    traverseImgArr(function (rgb, i, k) {     //출력 배열 255로 값 초기화
        if (rgb == 3)
            outImageArray[rgb][i][k] = 0;   // 이미지 없는 부분은 투명하게
        else
            outImageArray[rgb][i][k] = 255;
    }, outHeight, outWidth);
    /*  역방향 회전 공식
    xs = cos * xd - sin * yd;
    ys = -sin * xd + cos * yd;   */
    var xd, yd, xs, ys;
    //중앙점 처리
    var inCh = Math.round(inHeight / 2);
    var inCw = Math.round(inWidth / 2);
    var outCh = Math.round(outHeight / 2);
    var outCw = Math.round(outWidth / 2);
    //영상처리 알고리즘
    traverseImgArr(function (rgb, i, k) {
        xs = i;
        ys = k;
        xd = parseInt(Math.cos(radian) * (xs - outCh) - Math.sin(radian) * (ys - outCw) + inCh);
        yd = parseInt(Math.sin(radian) * (xs - outCh) + Math.cos(radian) * (ys - outCw) + inCw);
        if ((xd > -1 && xd < inHeight) && (yd > -1 && yd < inWidth))
            outImageArray[rgb][xs][ys] = inImageArray[rgb][xd][yd];
    }, outHeight, outWidth);
    displayImage();
}

/* 좌우 미러링 */
function toMirrorLR() {
    //출력 관련 변수 초기화
    decOutVars();
    //출력할 배열에 값 좌우 바꿔서 저장
    traverseImgArr(function (rgb, i, k) {
        outImageArray[rgb][i][inWidth - 1 - k] = inImageArray[rgb][i][k];
    }, inHeight, inWidth);
    displayImage();
}

/* 상하 미러링 */
function toMirrorTB() {
    decOutVars();
    //출력할 배열에 값 상하 바꿔서 저장
    traverseImgArr(function (rgb, i, k) {
        outImageArray[rgb][inHeight - 1 - i][k] = inImageArray[rgb][i][k];
    }, inHeight, inWidth);
    displayImage();
}

/* 대각선 미러링 -- 90도 회전 아님. 정사각형 이미지의 경우에만 작동. */
function toMirrorDiag() {
    if (inHeight != inWidth) {
        alert("대각선으로 접을 수 없습니다");
        return;
    }
    decOutVars();
    //출력할 배열에 값 좌우 바꿔서 저장
    traverseImgArr(function (rgb, i, k) {
        outImageArray[rgb][k][i] = inImageArray[rgb][i][k];
    }, inHeight, inWidth);
    displayImage();
}

/* 히스토그램 스트레칭 */
function doHistStretch() {
    //각 색깔 채널별로 최대최소값 구하기
    let maxRGBArr = [inImageArray[0][0][0], inImageArray[1][0][0], inImageArray[2][0][0]];
    let minRGBArr = [inImageArray[0][0][0], inImageArray[1][0][0], inImageArray[2][0][0]];
    let rgbArr = [0, 0, 0];     //각 [i,k] 위치의 r, g, b 값을 순서대로 담은 배열
    for (var i = 0; i < inHeight; i++) {
        for (var k = 0; k < inWidth; k++) {
            for (var ch = 0; ch < 3; ch++) {
                rgbArr[ch] = inImageArray[ch][i][k];
            }
            //[i, k]에 위치한 픽셀의 r, g, b 값을 이미 찾은 r, g, b 각각의 최소, 최대값과 비교해서
            //해당되면 최소/최대값을 바꿔 저장한다
            for (var ch = 0; ch < 3; ch++) {
                if (rgbArr[ch] < minRGBArr[ch])
                    minRGBArr[ch] = rgbArr[ch];
                else if (rgbArr[ch] > maxRGBArr[ch])
                    maxRGBArr[ch] = rgbArr[ch];
            }
        }
    }
    //영상처리 부분
    decOutVars();
    let inPixel, outPixel;
    traverseImgArr(function (rgb, i, k) {
        if (rgb == 3) {    //알파 채널은 기존값 삽입
            outImageArray[rgb][i][k] = inImageArray[rgb][i][k];
        } else {
            inPixel = inImageArray[rgb][i][k];
            outPixel = (inPixel - minRGBArr[rgb]) / (maxRGBArr[rgb] - minRGBArr[rgb]) * 255;
            outImageArray[rgb][i][k] = parseInt(outPixel);
        }
    }, inHeight, inWidth);
    displayImage();
}

/* 엔드-인 탐색 */
function doEndIn() {
    //각 색깔 채널별로 최대최소값 구하기
    let maxRGBArr = [inImageArray[0][0][0], inImageArray[1][0][0], inImageArray[2][0][0]];
    let minRGBArr = [inImageArray[0][0][0], inImageArray[1][0][0], inImageArray[2][0][0]];
    let rgbArr = [0, 0, 0];     //각 [i,k] 위치의 r, g, b 값을 순서대로 담은 배열
    for (var i = 0; i < inHeight; i++) {
        for (var k = 0; k < inWidth; k++) {
            for (var ch = 0; ch < 3; ch++) {
                rgbArr[ch] = inImageArray[ch][i][k];
            }
            //[i, k]에 위치한 픽셀의 r, g, b 값을 이미 찾은 r, g, b 각각의 최소, 최대값과 비교해서
            //해당되면 최소/최대값을 바꿔 저장한다
            for (var ch = 0; ch < 3; ch++) {
                if (rgbArr[ch] < minRGBArr[ch])
                    minRGBArr[ch] = rgbArr[ch];
                else if (rgbArr[ch] > maxRGBArr[ch])
                    maxRGBArr[ch] = rgbArr[ch];
            }
        }
    }
    //최대최솟값을 강제로 늘리고 줄인다
    for (var i = 0; i < 3; i++) {
        minRGBArr[i] += 60;
        maxRGBArr[i] -= 60;
    }
    //영상처리 부분
    decOutVars();
    let inPixel, outPixel;
    traverseImgArr(function (rgb, i, k) {
        if (rgb == 3) {    //알파 채널은 기존값 삽입
            outImageArray[rgb][i][k] = inImageArray[rgb][i][k];
        } else {
            inPixel = inImageArray[rgb][i][k];
            outPixel = (inPixel - minRGBArr[rgb]) / (maxRGBArr[rgb] - minRGBArr[rgb]) * 255;
            outImageArray[rgb][i][k] = parseInt(checkOverflow(outPixel));
        }
    }, inHeight, inWidth);
    displayImage();
}

/* 히스토그램 평활화 */
function doHistEqualize() {
    //1단계: 히스토그램 만들기
    let hist = new Array(3);
    for (var rgb = 0; rgb < 3; rgb++) {       //hist의 각 행에 0으로 채워진 256짜리 배열 생성
        (hist[rgb] = []).length = 256;  //빠르다고 하는데 과연?
        hist[rgb].fill(0);
    }
    //r,g,b 채널당 히스토그램 만들기
    let pix;
    for (rgb = 0; rgb < 3; rgb++) {
        for (var i = 0; i < inHeight; i++) {
            for (var k = 0; k < inWidth; k++) {
                pix = inImageArray[rgb][i][k];
                hist[rgb][pix]++;
            }
        }
    }
    //2단계: 누적 히스토그램 생성
    let sumHist = new Array(3);
    for (var rgb = 0; rgb < 3; rgb++) {       //배열의 각 행에 0으로 채워진 256짜리 배열 생성
        (sumHist[rgb] = []).length = 256;  //빠르다고 하는데 과연?
        sumHist[rgb].fill(0);
    }
    let sumVal = [0, 0, 0];
    for (var i = 0; i < 256; i++) {
        sumVal[0] += hist[0][i];
        sumVal[1] += hist[1][i];
        sumVal[2] += hist[2][i];
        sumHist[0][i] = sumVal[0];
        sumHist[1][i] = sumVal[1];
        sumHist[2][i] = sumVal[2];
    }
    //3단계: 정규화된 누적 히스토그램
    let normHist = new Array(3);
    for (var rgb = 0; rgb < 3; rgb++) {       //배열의 각 행에 0으로 채워진 256짜리 배열 생성
        (normHist[rgb] = []).length = 256;  //빠르다고 하는데 과연?
        normHist[rgb].fill(0);
    }
    for (var i = 0; i < 256; i++) {
        normHist[0][i] = sumHist[0][i] * (1 / (inWidth * inHeight)) * 255;
        normHist[1][i] = sumHist[1][i] * (1 / (inWidth * inHeight)) * 255;
        normHist[2][i] = sumHist[2][i] * (1 / (inWidth * inHeight)) * 255;
    }
    //출력배열에 값 넣기
    decOutVars();
    let inPixel, outPixel;
    traverseImgArr(function (rgb, i, k) {
        if (rgb == 3) {
            outImageArray[rgb][i][k] = inImageArray[rgb][i][k];
        } else {
            inPixel = inImageArray[rgb][i][k];
            outPixel = normHist[rgb][inPixel];
            outImageArray[rgb][i][k] = parseInt(checkOverflow(outPixel));
        }
    }, inHeight, inWidth);
    displayImage();
}

/* 화소 영역 처리 알고리즘의 틀. 하나의 마스크와 후처리 할지(1) 안 할지(0)를 인풋으로 받아 작동한다.*/
function processKernelImg(maskOpt, afterProcessing) {
    //마스크에서 임시 입력 배열에 더할 행/열의 수 구하기
    let offset = Math.trunc(maskOpt.length / 2);    //offset*2가 임시 입력 배열에 더할 행/열의 수
    let tempH = inHeight + offset * 2;  //임시 입력 배열의 높이
    let tempW = inWidth + offset * 2;   //와 너비
    //임시 입력 배열 생성
    let tempInputArr = new Array(4);
    for (var rgb = 0; rgb < 4; rgb++) {
        tempInputArr[rgb] = new Array(tempH);
        for (var i = 0; i < tempH; i++) {
            tempInputArr[rgb][i] = new Array(tempW);
        }
    }
    //임시 입력 배열 초기화
    for (rgb = 0; rgb < 4; rgb++) {
        for (var i = 0; i < tempH; i++) {
            for (var k = 0; k < tempW; k++) {
                tempInputArr[rgb][i][k] = 127;
            }
        }
    }
    //입력 배열의 값들을 임시 입력 배열에 삽입
    for (rgb = 0; rgb < 4; rgb++) {
        for (var i = 0; i < inHeight; i++) {
            for (var k = 0; k < inWidth; k++) {
                tempInputArr[rgb][i + offset][k + offset] = inImageArray[rgb][i][k];
            }
        }
    }
    //영상 처리 알고리즘 구현
    decOutVars();
    traverseImgArr(function (rgb, i, k) {
        if (rgb == 3) {
            outImageArray[rgb][i][k] = 255;
        } else {
            let S = 0.0;
            //마스크 내의 계산
            for (var m = 0; m < (offset * 2 + 1); m++) {
                for (var n = 0; n < (offset * 2 + 1); n++) {
                    S += maskOpt[m][n] * tempInputArr[rgb][i + m][k + n];
                }
            }
            outImageArray[rgb][i][k] = S;
        }
    }, outHeight, outWidth);
    //후처리 작업: 마스크의 합계가 0이면 결과에 127을 더한다
    if (afterProcessing == 1) {
        traverseImgArr(function (rgb, i, k) {
            if (rgb == 3) {
                outImageArray[rgb][i][k] = inImageArray[rgb][i][k];
            } else {
                outImageArray[rgb][i][k] += 98.0;
            }
        }, outHeight, outWidth);
    }
    //오버플로우 체크
    traverseImgArr(function (rgb, i, k) {
        outImageArray[rgb][i][k] = checkOverflow(outImageArray[rgb][i][k]);
    }, outHeight, outWidth);
    displayImage();
}

/* 에지 검출 알고리즘의 틀. 수평, 수직 마스크 한 쌍을 인풋으로 받아 작동한다.*/
//Q: 에지 검출 할 때 후처리 하는지 안하는지? 그리고 왜 그런지?
function detectEdge(maskPair, afterProcessing) {
    //인풋을 지역 변수로 풀어내고
    let maskHrz = maskPair[0];
    let maskVrt = maskPair[1];
    //마스크에서 임시 입력 배열에 더할 행/열의 수 구하기
    let offset = Math.trunc(maskHrz.length / 2);    //offset*2가 임시 입력 배열에 더할 행/열의 수
    let tempH = inHeight + offset * 2;  //임시 입력 배열의 높이
    let tempW = inWidth + offset * 2;   //와 너비
    //임시 입력 배열 생성
    let tempInputArr = new Array(4);
    for (var rgb = 0; rgb < 4; rgb++) {
        tempInputArr[rgb] = new Array(tempH);
        for (var i = 0; i < tempH; i++) {
            tempInputArr[rgb][i] = new Array(tempW);
        }
    }
    //임시 입력 배열 초기화
    for (rgb = 0; rgb < 4; rgb++) {
        for (var i = 0; i < tempH; i++) {
            for (var k = 0; k < tempW; k++) {
                tempInputArr[rgb][i][k] = 127;
            }
        }
    }
    //입력 배열의 값들을 임시 입력 배열에 삽입
    for (rgb = 0; rgb < 4; rgb++) {
        for (var i = 0; i < inHeight; i++) {
            for (var k = 0; k < inWidth; k++) {
                tempInputArr[rgb][i + offset][k + offset] = inImageArray[rgb][i][k];
            }
        }
    }
    //영상 처리 알고리즘 구현
    decOutVars();
    traverseImgArr(function (rgb, i, k) {
        if (rgb == 3) {
            outImageArray[rgb][i][k] = inImageArray[rgb][i][k];
        } else {
            let H = 0.0; let V = 0.0;
            //마스크 내의 계산
            for (var m = 0; m < (offset * 2 + 1); m++) {
                for (var n = 0; n < (offset * 2 + 1); n++) {
                    H += maskHrz[m][n] * tempInputArr[rgb][i + m][k + n];
                    V += maskVrt[m][n] * tempInputArr[rgb][i + m][k + n];
                }
            }
            outImageArray[rgb][i][k] = H + V;
        }
    }, outHeight, outWidth);
    //후처리 작업: 마스크의 합계가 0이면 결과에 127을 더한다
    if (afterProcessing == 1) {
        traverseImgArr(function (rgb, i, k) {
            if (rgb == 3) {
                outImageArray[rgb][i][k] = inImageArray[rgb][i][k];
            } else {
                outImageArray[rgb][i][k] += 100.0;
            }
        }, outHeight, outWidth);
    }
    //오버플로우 체크
    traverseImgArr(function (rgb, i, k) {
        outImageArray[rgb][i][k] = checkOverflow(outImageArray[rgb][i][k]);
    }, outHeight, outWidth);
    displayImage();
}

/*************************************** */
/******************* 실험적인 함수들 ********************************* */
/*********************************************** */

/* double exposure 버튼 클릭 */
function loadDoubleExp() {
    let layerFile = document.createElement("input");
    layerFile.type = "file";
    layerFile.style.display = "none";

    var layerImg = new Image();

    layerImg.onload = function () {
        let imgW = layerImg.width;
        let imgH = layerImg.height;
        mainCtx.drawImage(layerImg, 0, 0, imgW, imgH);   //출력하고
        layerImgArr = new Array(4);      //입력 배열 생성
        for (var rgb = 0; rgb < 4; rgb++) {
            layerImgArr[rgb] = new Array(imgH);
            for (var i = 0; i < imgH; i++) {
                layerImgArr[rgb][i] = new Array(imgW);
            }
        }
        //출력된 캔버스에서 픽셀값 뽑아서 입력 배열에 삽입
        let imgData = mainCtx.getImageData(0, 0, imgW, imgH);
        let R, G, B, alpha;
        for (var i = 0; i < imgH; i++) {
            for (var k = 0; k < imgW; k++) {
                let px = (i * imgW + k) * 4;
                R = imgData.data[px + 0];
                G = imgData.data[px + 1];
                B = imgData.data[px + 2];
                alpha = imgData.data[px + 3];
                layerImgArr[0][i][k] = R;
                layerImgArr[1][i][k] = G;
                layerImgArr[2][i][k] = B;
                layerImgArr[3][i][k] = alpha;
            }
        }
    }

    /* RAW 형식의 이미지를 배열에 저장. double exposure 서브 함수 */
    function loadArrFromRAW(file) {
        let imgW = Math.sqrt(file.size);
        let imgH = Math.sqrt(file.size);
        //입력용 3차원 배열 준비
        layerImgArr = new Array(4);
        for (var i = 0; i < 4; i++) {
            layerImgArr[i] = new Array(imgH);
            for (var k = 0; k < imgH; k++) {
                layerImgArr[i][k] = new Array(imgW);
            }
        }
        //raw 파일을 위에 만든 2차원 배열로 읽어들인다
        var reader = new FileReader();
        reader.readAsBinaryString(file);
        reader.onload = function () {
            var bin = reader.result;    //파일을 덩어리로 읽었음
            //통째로 저장한 bin에서 한 픽셀씩 3차원 배열에 넣기
            let start, end, pix;
            for (var i = 0; i < imgH; i++) {
                for (var k = 0; k < imgW; k++) {
                    start = i * imgH + k;
                    end = (i * imgH + k) + 1;
                    pix = bin.slice(start, end);
                    layerImgArr[0][i][k] = pix.charCodeAt(0);
                    layerImgArr[1][i][k] = pix.charCodeAt(0);
                    layerImgArr[2][i][k] = pix.charCodeAt(0);
                    layerImgArr[3][i][k] = 255;        //즉 rgba 형태의 그레이스케일 이미지로 만듬
                }
            }
        }
    }

    layerFile.onchange = function (e) {
        let file = e.target.files[0];
        //선택된 파일의 연장자에 따라 이미지 받는 함수 골라 부르기
        if (file.type.match(/raw/i))
            loadArrFromRAW(file);
        else {
            layerImg.src = URL.createObjectURL(file);
            URL.revokeObjectURL(file);
        }
    };

    layerFile.click();
}

/* double exposure 효과. 슬라이드바 값 입력 받아서 호출됨 */
function doDoubleExp(inVal) {
    // double exposure 함수를 콜하는 스라이드바 생성
    if (dynLbl.innerHTML != "노출 정도") {
        if (document.getElementById("slider") != null) {
            dynSliderTD.removeChild(document.getElementById("slider"));
            dynLbl.innerHTML = "";
        }
        createSlider(1, 10, 5, 0.1);
        dynLbl.innerHTML = "노출 정도";
        document.getElementById("slider").addEventListener("change", function () { doDoubleExp(parseInt(this.value)) });
    }

    if (inVal == NaN || inVal == null)
        inVal = 5;

    let ratio = 1 / inVal;
    decOutVars();
    let layerH = layerImgArr[0].length;
    let layerW = layerImgArr[0][0].length;
    traverseImgArr(function (rgb, i, k) {
        if (i < layerH && k < layerW)
            outImageArray[rgb][i][k] = checkOverflow(parseInt(inImageArray[rgb][i][k] * (1 - ratio) + layerImgArr[rgb][i][k] * ratio));
        else
            outImageArray[rgb][i][k] = inImageArray[rgb][i][k];
    }, outHeight, outWidth);
    displayImage();
}

/* 마우스 이벤트로 캔버스에서 범위 선택해서 하는 작업들 */
function canvasAreaME(option) {
    mainCanvas.addEventListener("mousedown", downMouse, false);
    mainCanvas.addEventListener("mouseup", upMouse, false);

    var sx, sy, ex, ey;
    //여기서만 쓰므로 내부 함수로 하고, 내부 함수이므로 던더를 붙일 필요 없음
    function downMouse(e) {
        sx = e.offsetX; sy = e.offsetY;
    }

    function upMouse(e) {
        ex = e.offsetX; ey = e.offsetY;
        if (sx > ex) {
            var tmp = sx; sx = ex; ex = tmp;
        }
        if (sy > ey) {
            var tmp = sy; sy = ey; ey = tmp;
        }
        mainCanvas.removeEventListener("mousedown", downMouse, false);
        mainCanvas.removeEventListener("mouseup", upMouse, false);

        mainCtx.beginPath();
        mainCtx.strokeStyle = "grey";
        let w = Math.abs(ex - sx);
        let h = Math.abs(ey - sy);
        mainCtx.rect(Math.min(sx, ex), Math.min(sy, ey), w, h);
        mainCtx.stroke();
        mainCtx.closePath();

        if (option == "neg")
            __negImg_mouse();  //영상처리 함수
        if (option == "bw")
            __bwImg_mouse();
        if (option == "gray")
            __grayImg_mouse();
    }

    function __negImg_mouse() {
        decOutVars();
        traverseImgArr(function (rgb, i, k) {
            if (rgb == 3)
                outImageArray[rgb][i][k] = inImageArray[rgb][i][k];
            else {
                if ((sx <= k && k <= ex) && (sy <= i && i <= ey)) {
                    outImageArray[rgb][i][k] = checkOverflow(255 - inImageArray[rgb][i][k]);
                } else {
                    outImageArray[rgb][i][k] = inImageArray[rgb][i][k];
                }
            }
        }, outHeight, outWidth);
        displayImage();
    }

    function __bwImg_mouse() {
        decOutVars();  //출력 변수와 배열 초기화
        //영상처리 알고리즘
        let R, G, B, grayVal;
        let inVal = 90;
        for (var i = 0; i < inHeight; i++) {
            for (var k = 0; k < inWidth; k++) {
                if ((sx <= k && k <= ex) && (sy <= i && i <= ey)) {
                    R = inImageArray[0][i][k];
                    G = inImageArray[1][i][k];
                    B = inImageArray[2][i][k];
                    grayVal = parseInt(0.299 * R + 0.587 * G + 0.114 * B);
                    grayVal = (grayVal > inVal) ? 255 : 0;
                    outImageArray[0][i][k] = grayVal;
                    outImageArray[1][i][k] = grayVal;
                    outImageArray[2][i][k] = grayVal;
                } else {
                    outImageArray[0][i][k] = inImageArray[0][i][k];
                    outImageArray[1][i][k] = inImageArray[1][i][k];
                    outImageArray[2][i][k] = inImageArray[2][i][k];
                }
                outImageArray[3][i][k] = inImageArray[3][i][k];
            }
        }
        displayImage();
    }

    function __grayImg_mouse() {
        decOutVars();
        let R, G, B;
        for (var i = 0; i < inHeight; i++) {
            for (var k = 0; k < inWidth; k++) {
                if ((sx <= k && k <= ex) && (sy <= i && i <= ey)) {
                    R = inImageArray[0][i][k];
                    G = inImageArray[1][i][k];
                    B = inImageArray[2][i][k];

                    var RGB = checkOverflow(parseInt(0.299 * R + 0.587 * G + 0.114 * B));

                    outImageArray[0][i][k] = RGB;
                    outImageArray[1][i][k] = RGB;
                    outImageArray[2][i][k] = RGB;
                } else {
                    outImageArray[0][i][k] = inImageArray[0][i][k];
                    outImageArray[1][i][k] = inImageArray[1][i][k];
                    outImageArray[2][i][k] = inImageArray[2][i][k];
                }
                outImageArray[3][i][k] = inImageArray[3][i][k];
            }
        }
        displayImage();
    }
}

