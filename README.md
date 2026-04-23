# Video Flicker Tool

### Screenshot | スクリーンショット | 项目截图
<img width="1372" height="1648" alt="image" src="https://github.com/user-attachments/assets/da61fb99-0544-4e20-b52b-f8c69fedb4ff" />

[English](#english) | [日本語](#日本語) | [中文](#中文)

---

<h2 id="english">English</h2>

### Introduction
This project is a web application designed to analyze pixel intensity changes in video files over time. It utilizes a Python backend for video processing and a React frontend for data visualization and parameter adjustment.

### Deployment
1. **Backend**
   - Requires Python 3.
   - Install dependencies: `pip install fastapi uvicorn opencv-python numpy python-multipart`
   - Ensure FFmpeg is installed and added to the system PATH.
   - Start the backend server: `cd backend` then run `uvicorn main:app --reload` (or `python main.py`).
2. **Frontend**
   - Requires Node.js.
   - Install dependencies: `cd frontend` then run `npm install`.
   - Start the development server: `npm run dev`.

### Usage
1. **Cropper Tab**
   - Upload a video file.
   - Select the specific area and time range of the video to be analyzed.
   - Execute the crop operation. The processed video file will be saved in the `backend/uploads` directory.
2. **Analyze Tab**
   - Upload the cropped video file from the `uploads` directory.
   - The application will calculate the mean pixel intensity per frame and display the waveform.
   - Adjust the n-th order Fourier series parameters to fit the waveform. The calculation implements logic to ensure the generated Fourier series forms a continuous, seamless loop.
   - Copy the generated Fourier series script for external usage.

---

<h2 id="日本語">日本語</h2>

### 概要
本プロジェクトは、動画ファイル内のピクセル輝度の経時変化を分析するためのWebアプリケーションです。動画処理にはPythonバックエンドを使用し、データの視覚化とパラメータ調整にはReactフロントエンドを使用します。

### デプロイ方法
1. **バックエンド**
   - Python 3が必要です。
   - 依存パッケージのインストール: `pip install fastapi uvicorn opencv-python numpy python-multipart`
   - FFmpegがインストールされ、システムのPATHに追加されていることを確認します。
   - バックエンドサーバーの起動: `cd backend` の後、`uvicorn main:app --reload` (または `python main.py`) を実行します。
2. **フロントエンド**
   - Node.jsが必要です。
   - 依存パッケージのインストール: `cd frontend` の後、`npm install` を実行します。
   - 開発サーバーの起動: `npm run dev` を実行します。

### 使用方法
1. **Cropper（クロップ）機能**
   - 動画ファイルをアップロードします。
   - 分析が必要な動画の特定領域と時間範囲を選択します。
   - クロップを実行します。処理された動画ファイルは `backend/uploads` ディレクトリに出力されます。
2. **Analyze（分析）機能**
   - 出力されたクロップ済み動画ファイルをアップロードします。
   - アプリケーションがフレームごとの平均ピクセル輝度を計算し、波形を表示します。
   - n次フーリエ級数のパラメータを調整して波形にフィッティングさせます。このフーリエ級数は、始点と終点が繋がり連続したループ再生が可能になるように計算されています。
   - 生成されたフーリエ級数のスクリプトをコピーして外部で利用できます。

---

<h2 id="中文">中文</h2>

### 简介
本项目是一个用于分析视频文件中像素亮度随时间变化的Web应用程序。项目使用Python后端进行视频处理，使用React前端进行数据可视化和参数调整。

### 部署方法
1. **后端**
   - 需要 Python 3 环境。
   - 安装依赖：`pip install fastapi uvicorn opencv-python numpy python-multipart`
   - 确保系统已安装 FFmpeg 并已添加到环境变量 PATH 中。
   - 运行后端服务器：`cd backend` 后执行 `uvicorn main:app --reload` (或 `python main.py`)。
2. **前端**
   - 需要 Node.js 环境。
   - 安装依赖：`cd frontend` 后执行 `npm install`。
   - 运行开发服务器：`npm run dev`。

### 使用方法
1. **Cropper 选项卡**
   - 上传视频文件。
   - 截取视频中需要进行闪烁分析的特定区域和时间范围。
   - 执行截取操作，处理后的视频文件将输出保存在 `backend/uploads` 目录中。
2. **Analyze 选项卡**
   - 上传上述输出的截取视频文件。
   - 应用程序将计算每一帧的平均像素亮度并显示为波形。
   - 调整 n 阶傅里叶级数参数对波形进行拟合。该傅里叶级数实现了首尾相连的逻辑，便于循环播放。
   - 复制生成的傅里叶级数脚本以供外部使用。
