class MindMap {
  constructor() {
    this.canvas = document.getElementById("canvas");
    this.canvasContent = document.getElementById("canvas-content");
    this.zoomLevel = 1;
    this.maxZoom = 2.5;
    this.minZoom = 0.1;
    this.themeSelect = document.getElementById("theme-select");
    this.colorPalette = document.querySelector(".color-palette");
    this.selectedColor = "default";
    this.uiPanel = document.getElementById("ui-panel");
    this.minimizeBtn = document.getElementById("minimize-btn");
    this.lineTypeIndicator = document.getElementById("line-type-indicator");
    this.lineTypeText = document.getElementById("line-type-text");
    this.currentLineType = "solid";
    this.isSpacePressed = false;

    // Toolbar elements
    this.saveBtn = document.getElementById("save-btn");
    this.loadBtn = document.getElementById("load-btn");
    this.exportPngBtn = document.getElementById("export-png-btn");
    this.exportJsonBtn = document.getElementById("export-json-btn");
    this.clearBtn = document.getElementById("clear-btn");
    this.fileInput = document.getElementById("file-input");
    this.bubbles = [];
    this.connections = [];
    this.isDragging = false;
    this.isConnecting = false;
    this.dragTarget = null;
    this.connectStart = null;
    this.tempLine = null;
    this.dragOffset = { x: 0, y: 0 };
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.translateX = 0;
    this.translateY = 0;

    // Color definitions
    this.colors = {
      default: {
        bg: "#8B7ED8",
        border: "#fff",
        text: "white",
        connection: "#8B7ED8",
      },
      temp: {
        
      },
      red: {
        bg: "#E85A5A",
        border: "#fff",
        text: "white",
        connection: "#E85A5A",
      },
      blue: {
        bg: "#5A9BD4",
        border: "#fff",
        text: "white",
        connection: "#5A9BD4",
      },
      green: {
        bg: "#7BC142",
        border: "#fff",
        text: "white",
        connection: "#7BC142",
      },
      yellow: {
        bg: "#F4A460",
        border: "#fff",
        text: "white",
        connection: "#F4A460",
      },
      purple: {
        bg: "#9B59B6",
        border: "#fff",
        text: "white",
        connection: "#9B59B6",
      },
      orange: {
        bg: "#E67E22",
        border: "#fff",
        text: "white",
        connection: "#E67E22",
      },
      teal: {
        bg: "#1ABC9C",
        border: "#fff",
        text: "white",
        connection: "#1ABC9C",
      },
      pink: {
        bg: "#E91E63",
        border: "#fff",
        text: "white",
        connection: "#E91E63",
      }
    };

    this.init();
  }

  init() {
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.addEventListener("dblclick", this.handleDoubleClick.bind(this));
    this.canvas.addEventListener("wheel", this.handleWheel.bind(this));
    this.themeSelect.addEventListener(
      "change",
      this.handleThemeChange.bind(this)
    );
    this.minimizeBtn.addEventListener("click", this.toggleMinimize.bind(this));

    // Add color palette event listeners
    this.colorPalette.addEventListener(
      "click",
      this.handleColorChange.bind(this)
    );

    // Add toolbar event listeners
    // this.saveBtn.addEventListener("click", this.saveMindMap.bind(this));
    this.loadBtn.addEventListener("click", () => this.fileInput.click());
    this.fileInput.addEventListener("change", this.loadMindMap.bind(this));
    // this.exportPngBtn.addEventListener("click", this.exportToPNG.bind(this));
    this.exportJsonBtn.addEventListener("click", this.exportToJSON.bind(this));
    this.clearBtn.addEventListener("click", this.clearAll.bind(this));

    // Add zoom detection
    this.updateBrowserZoom();
    window.addEventListener('resize', this.updateBrowserZoom.bind(this));

    // Add keydown event listener for line type toggle
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));

    const savedTheme = localStorage.getItem("mindmap-theme");
    if (savedTheme) {
      this.themeSelect.value = savedTheme;
      document.body.className = savedTheme === "default" ? "" : `theme-${savedTheme}`;
    }
  }

  updateBrowserZoom() {
    const zoom = window.devicePixelRatio;
    document.documentElement.style.setProperty('--browser-zoom', zoom);
  }

  toggleMinimize() {
    const isMinimized = this.uiPanel.classList.contains("minimized");

    if (isMinimized) {
      this.uiPanel.classList.remove("minimized");
      this.minimizeBtn.textContent = "−";
    } else {
      this.uiPanel.classList.add("minimized");
      this.minimizeBtn.textContent = "+";
    }
  }

  screenToCanvas(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (screenX - rect.left - this.translateX) / this.zoomLevel,
      y: (screenY - rect.top - this.translateY) / this.zoomLevel
    };
  }

  handleKeyDown(e) {
    // Check if we're currently editing a bubble
    const isEditingBubble = document.querySelector('.bubble.editing');
    
    if ((e.key === ' ' || e.code === 'Space') && !isEditingBubble) {
      e.preventDefault(); // Prevent page scrolling
      this.isSpacePressed = true;
    }
    if (e.code === 'ShiftLeft' && this.isConnecting) {
      this.toggleLineType();
    }

    // Handle number keys 1-9 for color selection
    const num = parseInt(e.key);
    if (num >= 1 && num <= 9 && !isEditingBubble) {
      const colorOptions = Array.from(this.colorPalette.querySelectorAll('.color-option'));
      if (colorOptions[num - 1]) {
        this.colorPalette.querySelectorAll('.color-option').forEach(option => {
          option.classList.remove('selected');
        });
        colorOptions[num - 1].classList.add('selected');
        this.selectedColor = colorOptions[num - 1].dataset.color;
      }
    }
  }

  handleKeyUp(e) {
    if (e.key === ' ' || e.code === 'Space') {
      this.isSpacePressed = false;
    }
  }

  handleMouseDown(e) {
    if (e.button === 0 && !e.ctrlKey && !e.target.closest(".bubble")) {
      this.isPanning = true;
      this.panStart = { x: e.clientX, y: e.clientY };
      return;
    }

    if ((e.ctrlKey && e.button === 2) || e.button === 1) {
      const target = e.target.closest(".bubble");
      if (target) {
        this.deleteBubble(target);
        return;
      }
    }

    // Handle shift + right-click for color changing
    if (e.button === 2 && e.shiftKey) {
      const target = e.target.closest(".bubble");
      if (target) {
        this.changeBubbleColor(target, this.selectedColor);
        return;
      }
    }

    if (e.button === 2 || (e.ctrlKey && e.button === 0)) {
      const target = e.target.closest(".bubble");
      if (target) {
        this.isConnecting = true;
        this.connectStart = target;
        this.currentLineType = "solid";
        this.createTempLine(e.clientX, e.clientY);
        this.showLineTypeIndicator();
      } else if (e.button === 2) {
        this.createBubble(e.clientX, e.clientY);
      }
    } else if (e.button === 0 && this.isConnecting) {
      e.preventDefault();
      e.stopPropagation();
      this.toggleLineType();
    } else if (e.button === 0) {
      const target = e.target.closest(".bubble");
      if (target && !target.classList.contains("editing")) {
        this.isDragging = true;
        this.dragTarget = target;
        this.panStart = { x: e.clientX, y: e.clientY };

        const canvasPos = this.screenToCanvas(e.clientX, e.clientY);
        const bubbleLeft = parseFloat(target.style.left);
        const bubbleTop = parseFloat(target.style.top);

        this.dragOffset = {
          x: canvasPos.x - bubbleLeft,
          y: canvasPos.y - bubbleTop,
        };
      }
    }
  }

  handleMouseMove(e) {
    if (this.isPanning) {
      const dx = e.clientX - this.panStart.x;
      const dy = e.clientY - this.panStart.y;
      this.translateX += dx;
      this.translateY += dy;
      this.panStart = { x: e.clientX, y: e.clientY };
      this.updateCanvasTransform();
      return;
    }

    if (this.isDragging && this.dragTarget) {
      const canvasPos = this.screenToCanvas(e.clientX, e.clientY);
      const x = canvasPos.x - this.dragOffset.x;
      const y = canvasPos.y - this.dragOffset.y;

      if (e.shiftKey) {
        // Resize bubble when holding shift
        const deltaY = this.panStart.y - e.clientY;
        const currentHeight = parseFloat(this.dragTarget.style.height) || 40;
        const newHeight = Math.max(20, currentHeight + deltaY);
        const heightDiff = newHeight - currentHeight;
        
        // Update height
        this.dragTarget.style.height = `${newHeight}px`;
        
        // Move the bubble up by half the height difference to maintain center point
        const currentTop = parseFloat(this.dragTarget.style.top);
        this.dragTarget.style.top = `${currentTop - heightDiff/2}px`;
        
        this.panStart = { x: e.clientX, y: e.clientY };
      } else {
        // Move bubble normally
        // Get all child bubbles if space is pressed
        const childBubbles = this.isSpacePressed ? this.getChildBubbles(this.dragTarget) : [];
        
        // Calculate the movement delta
        const oldX = parseFloat(this.dragTarget.style.left);
        const oldY = parseFloat(this.dragTarget.style.top);
        const deltaX = x - oldX;
        const deltaY = y - oldY;
        
        // Move the parent bubble
        this.moveBubble(this.dragTarget, x, y);
        
        // Move all child bubbles by the same delta if space is pressed
        if (this.isSpacePressed) {
          childBubbles.forEach(child => {
            const childX = parseFloat(child.style.left) + deltaX;
            const childY = parseFloat(child.style.top) + deltaY;
            this.moveBubble(child, childX, childY);
          });
        }
      }
      
      this.updateConnections();
    } else if (this.isConnecting && this.tempLine) {
      this.updateTempLine(e.clientX, e.clientY);
    }
  }

  handleMouseUp(e) {
    this.isPanning = false;
    if (this.isDragging) {
      this.isDragging = false;
      this.dragTarget = null;
    } else if (this.isConnecting) {
      const target = e.target.closest(".bubble");
      if (target && target !== this.connectStart) {
        this.createConnection(this.connectStart, target, this.currentLineType);
      }
      this.isConnecting = false;
      this.connectStart = null;
      this.removeTempLine();
      this.hideLineTypeIndicator();
    }
  }

  handleDoubleClick(e) {
    const target = e.target.closest(".bubble");
    if (target) {
      this.editBubble(target);
    }
  }

  toggleLineType() {
    this.currentLineType =
      this.currentLineType === "solid" ? "dashed" : "solid";
    this.updateLineTypeIndicator();

    if (this.tempLine) {
      this.updateTempLineStyle();
    }
  }

  updateLineTypeIndicator() {
    this.lineTypeText.textContent =
      this.currentLineType === "solid" ? "Solid" : "Dashed";
  }

  showLineTypeIndicator() {
    this.updateLineTypeIndicator();
    this.lineTypeIndicator.classList.add("visible");
  }

  hideLineTypeIndicator() {
    this.lineTypeIndicator.classList.remove("visible");
  }

  createBubble(screenX, screenY) {
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = "Idea";
    bubble.dataset.color = this.selectedColor;

    this.applyBubbleColor(bubble, this.selectedColor);

    const canvasPos = this.screenToCanvas(screenX, screenY);
    const bubbleX = canvasPos.x - 40;
    const bubbleY = canvasPos.y - 20;

    this.moveBubble(bubble, bubbleX, bubbleY);

    this.canvasContent.appendChild(bubble);
    this.bubbles.push(bubble);

    setTimeout(() => {
      this.editBubble(bubble);
    }, 10);
  }

  moveBubble(bubble, x, y) {
    const canvasWidth = this.canvas.clientWidth;
    const canvasHeight = this.canvas.clientHeight;
    const bubbleWidth = bubble.offsetWidth || 80;
    const bubbleHeight = bubble.offsetHeight || 40;

    // x = Math.max(0, Math.min(x, canvasWidth - bubbleWidth));
    // y = Math.max(0, Math.min(y, canvasHeight - bubbleHeight));

    bubble.style.left = x + "px";
    bubble.style.top = y + "px";
  }

  resizeBubble(bubble, deltaY) {
    const currentWidth = bubble.offsetWidth;
    const currentHeight = bubble.offsetHeight;

    const originalWidth = bubble.style.width;
    const originalHeight = bubble.style.height;
    bubble.style.width = "auto";
    bubble.style.height = "auto";

    const minWidth = bubble.offsetWidth;
    const minHeight = bubble.offsetHeight;

    bubble.style.width = originalWidth;
    bubble.style.height = originalHeight;

    const sizeChange = deltaY > 0 ? -8 : 8;
    const scale = (currentWidth + sizeChange) / currentWidth;
    const newWidth = Math.max(minWidth, currentWidth * scale);
    const newHeight = Math.max(minHeight, currentHeight * scale);

    bubble.style.width = newWidth + "px";
    bubble.style.height = newHeight + "px";

    const borderRadius = Math.min(20, newHeight / 2);
    bubble.style.borderRadius = borderRadius + "px";

    const baseFontSize = 12;
    const fontScale = Math.max(1, Math.min(2, newHeight / minHeight));
    bubble.style.fontSize = baseFontSize * fontScale + "px";

    this.updateConnections();
  }

  editBubble(bubble) {
    if (bubble.classList.contains("editing")) return;

    bubble.classList.add("editing");
    const currentText = bubble.textContent;
    const currentImage = bubble.querySelector('img');

    const input = document.createElement("input");
    input.type = "text";
    input.value = currentText;

    bubble.textContent = "";
    bubble.appendChild(input);
    input.focus();
    input.select();

    // Add clipboard paste event listener
    const handlePaste = (e) => {
      const items = e.clipboardData.items;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = items[i].getAsFile();
          const reader = new FileReader();
          
          reader.onload = (event) => {
            const img = document.createElement("img");
            img.src = event.target.result;
            img.style.maxWidth = "100px";
            img.style.maxHeight = "60px";
            img.style.objectFit = "contain";
            img.style.verticalAlign = "middle";
            img.style.marginLeft = "4px";
            
            // Clear text if it's just the default "Idea" text
            const newText = input.value === "Idea" ? "" : input.value;
            bubble.textContent = newText;
            bubble.appendChild(img);
            bubble.classList.remove("editing");
            this.updateConnections();
          };
          
          reader.readAsDataURL(blob);
          return;
        }
      }
    };

    input.addEventListener("paste", handlePaste);

    const finishEdit = () => {
      const newText = input.value || currentText;
      bubble.textContent = newText;
      
      // Restore image if it existed
      if (currentImage) {
        bubble.appendChild(currentImage.cloneNode(true));
      }
      
      bubble.classList.remove("editing");
      this.updateConnections();
      input.removeEventListener("paste", handlePaste);
    };

    input.addEventListener("blur", finishEdit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        finishEdit();
      } else if (e.key === "Escape") {
        bubble.textContent = currentText;
        if (currentImage) {
          bubble.appendChild(currentImage.cloneNode(true));
        }
        bubble.classList.remove("editing");
        input.removeEventListener("paste", handlePaste);
      }
    });
  }

  createTempLine(screenX, screenY) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "temp-line");
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.overflow = "visible";

    // Create filter for glow effect
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    filter.setAttribute("id", "glow");
    
    const feGaussianBlur = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
    feGaussianBlur.setAttribute("stdDeviation", "2.5");
    feGaussianBlur.setAttribute("result", "coloredBlur");

    const feMerge = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
    const feMergeNode1 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
    feMergeNode1.setAttribute("in", "coloredBlur");
    const feMergeNode2 = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
    feMergeNode2.setAttribute("in", "SourceGraphic");

    feMerge.appendChild(feMergeNode1);
    feMerge.appendChild(feMergeNode2);
    filter.appendChild(feGaussianBlur);
    filter.appendChild(feMerge);
    defs.appendChild(filter);
    svg.appendChild(defs);

    const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
    // Set color based on theme
    const isDarkTheme = document.body.classList.contains('theme-dark');
    line.setAttribute("stroke", isDarkTheme ? "#ffffff" : "#CCCCCC");
    line.setAttribute("stroke-width", "3");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("fill", "none");
    line.setAttribute("filter", "url(#glow)");
    line.setAttribute("opacity", "0.9");

    this.setLineStyle(line, this.currentLineType);

    svg.appendChild(line);
    this.canvasContent.appendChild(svg);
    this.tempLine = { svg, line };

    this.updateTempLine(screenX, screenY);
  }

  setLineStyle(lineElement, lineType) {
    if (lineType === "dashed") {
      lineElement.setAttribute("stroke-dasharray", "4,6");
    } else {
      lineElement.setAttribute("stroke-dasharray", "none");
    }
  }

  updateTempLineStyle() {
    if (this.tempLine) {
      this.setLineStyle(this.tempLine.line, this.currentLineType);
    }
  }

  updateTempLine(screenX, screenY) {
    if (!this.tempLine) return;

    const startWidth = this.connectStart.offsetWidth || 80;
    const startHeight = this.connectStart.offsetHeight || 40;
    const startLeft = parseFloat(this.connectStart.style.left) + startWidth / 2;
    const startTop = parseFloat(this.connectStart.style.top) + startHeight / 2;

    const endPos = this.screenToCanvas(screenX, screenY);

    const pathData = this.createCurvePath(
      startLeft,
      startTop,
      endPos.x,
      endPos.y
    );
    this.tempLine.line.setAttribute("d", pathData);
  }

  removeTempLine() {
    if (this.tempLine) {
      this.tempLine.svg.remove();
      this.tempLine = null;
    }
  }

  createCurvePath(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const baseIntensity = Math.min(distance * 0.3, 150);
    const angle = Math.atan2(dy, dx);

    let curveDirection = 1;

    if (Math.abs(dx) > Math.abs(dy)) {
      curveDirection = dy > 0 ? 1 : -1;
    } else {
      curveDirection = dx > 0 ? 1 : -1;
    }

    const perpX = -Math.sin(angle) * baseIntensity * curveDirection;
    const perpY = Math.cos(angle) * baseIntensity * curveDirection;

    const cp1x = x1 + dx * 0.3 + perpX * 0.7;
    const cp1y = y1 + dy * 0.3 + perpY * 0.7;
    const cp2x = x2 - dx * 0.3 + perpX * 0.3;
    const cp2y = y2 - dy * 0.3 + perpY * 0.3;

    return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
  }

  createConnection(bubble1, bubble2, lineType = "solid") {
    const exists = this.connections.some(
      (conn) =>
        (conn.start === bubble1 && conn.end === bubble2) ||
        (conn.start === bubble2 && conn.end === bubble1)
    );

    if (exists) return;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "connection");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.overflow = "visible";

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const gradient = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "linearGradient"
    );
    const gradientId = "gradient-" + Math.random().toString(36).substr(2, 9);
    gradient.setAttribute("id", gradientId);
    gradient.setAttribute("gradientUnits", "userSpaceOnUse");

    const bubbleColor = bubble2.dataset.color || "default";
    const connectionColor = this.colors[bubbleColor].connection;

    const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", connectionColor);
    stop1.setAttribute("stop-opacity", "0.9");

    const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop2.setAttribute("offset", "50%");
    stop2.setAttribute("stop-color", connectionColor);
    stop2.setAttribute("stop-opacity", "0.7");

    const stop3 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
    stop3.setAttribute("offset", "100%");
    stop3.setAttribute("stop-color", connectionColor);
    stop3.setAttribute("stop-opacity", "0.4");

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    gradient.appendChild(stop3);
    defs.appendChild(gradient);
    svg.appendChild(defs);

    const clickPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    clickPath.setAttribute("fill", "none");
    clickPath.setAttribute("stroke", "transparent");
    clickPath.setAttribute("stroke-width", "20");
    clickPath.setAttribute("stroke-linecap", "round");
    clickPath.style.pointerEvents = "stroke";
    clickPath.style.cursor = "pointer";

    const visiblePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    visiblePath.setAttribute("fill", "none");
    visiblePath.setAttribute("stroke", `url(#${gradientId})`);
    visiblePath.setAttribute("stroke-width", "4");
    visiblePath.setAttribute("stroke-linecap", "round");
    visiblePath.setAttribute("stroke-linejoin", "round");
    visiblePath.style.pointerEvents = "none";
    visiblePath.style.transition = "all 0.3s ease";
    visiblePath.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.1))";

    this.setLineStyle(visiblePath, lineType);

    const glowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    glowPath.setAttribute("fill", "none");
    glowPath.setAttribute("stroke", connectionColor);
    glowPath.setAttribute("stroke-width", "8");
    glowPath.setAttribute("stroke-linecap", "round");
    glowPath.setAttribute("stroke-linejoin", "round");
    glowPath.setAttribute("opacity", "0.1");
    glowPath.style.pointerEvents = "none";

    this.setLineStyle(glowPath, lineType);

    svg.appendChild(glowPath);
    svg.appendChild(clickPath);
    svg.appendChild(visiblePath);

    const connection = {
      start: bubble2,
      end: bubble1,
      element: svg,
      clickLine: clickPath,
      visibleLine: visiblePath,
      glowLine: glowPath,
      gradient: gradient,
      gradientId: gradientId,
      lineType: lineType,
    };

    clickPath.addEventListener("mouseenter", () => {
      visiblePath.setAttribute("stroke-width", "5");
      glowPath.setAttribute("opacity", "0.2");
      visiblePath.style.filter = "drop-shadow(0 3px 6px rgba(0,0,0,0.2))";
    });

    clickPath.addEventListener("mouseleave", () => {
      visiblePath.setAttribute("stroke-width", "4");
      glowPath.setAttribute("opacity", "0.1");
      visiblePath.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.1))";
    });

    clickPath.addEventListener("mousedown", (e) => {
      if ((e.ctrlKey && e.button === 2) || e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        this.deleteConnection(connection);
      }
    });

    this.connections.push(connection);
    this.canvasContent.appendChild(svg);
    this.updateConnection(connection);
  }

  updateConnection(connection) {
    const startWidth = connection.start.offsetWidth || 80;
    const startHeight = connection.start.offsetHeight || 40;
    const endWidth = connection.end.offsetWidth || 80;
    const endHeight = connection.end.offsetHeight || 40;

    const x1 = parseFloat(connection.start.style.left) + startWidth / 2;
    const y1 = parseFloat(connection.start.style.top) + startHeight / 2;
    const x2 = parseFloat(connection.end.style.left) + endWidth / 2;
    const y2 = parseFloat(connection.end.style.top) + endHeight / 2;

    connection.gradient.setAttribute("x1", x1);
    connection.gradient.setAttribute("y1", y1);
    connection.gradient.setAttribute("x2", x2);
    connection.gradient.setAttribute("y2", y2);

    const pathData = this.createCurvePath(x1, y1, x2, y2);
    connection.clickLine.setAttribute("d", pathData);
    connection.visibleLine.setAttribute("d", pathData);
    connection.glowLine.setAttribute("d", pathData);
  }

  deleteBubble(bubble) {
    this.connections = this.connections.filter((connection) => {
      if (connection.start === bubble || connection.end === bubble) {
        connection.element.remove();
        return false;
      }
      return true;
    });

    this.bubbles = this.bubbles.filter((b) => b !== bubble);
    bubble.remove();
  }

  deleteConnection(connectionObj) {
    this.connections = this.connections.filter(
      (connection) => connection !== connectionObj
    );
    connectionObj.element.remove();
  }

  updateConnections() {
    this.connections.forEach((connection) => {
      this.updateConnection(connection);
    });
  }

  handleThemeChange(e) {
    const theme = e.target.value;
    document.body.className = theme === "default" ? "" : `theme-${theme}`;

    this.connections.forEach((connection) => {
      const bubbleColor = connection.end.dataset.color || "default";
      const connectionColor = this.colors[bubbleColor].connection;

      const stops = connection.gradient.querySelectorAll("stop");
      stops[0].setAttribute("stop-color", connectionColor);
      stops[1].setAttribute("stop-color", connectionColor);
      stops[2].setAttribute("stop-color", connectionColor);

      connection.glowLine.setAttribute("stroke", connectionColor);
    });

    localStorage.setItem("mindmap-theme", e.target.value);
  }

  handleColorChange(e) {
    const colorOption = e.target.closest(".color-option");
    if (!colorOption) return;

    this.colorPalette.querySelectorAll(".color-option").forEach((option) => {
      option.classList.remove("selected");
    });

    colorOption.classList.add("selected");
    this.selectedColor = colorOption.dataset.color;
  }

  applyBubbleColor(bubble, color) {
    const colorScheme = this.colors[color];
    bubble.style.background = colorScheme.bg;
    bubble.style.borderColor = colorScheme.border;
    bubble.style.color = colorScheme.text;
    bubble.dataset.color = color;
  }

  updateZoomDisplay() {
    this.zoomDisplay.textContent = Math.round(this.zoomLevel * 100) + "%";
  }

  saveMindMap() {
    const data = this.exportData();
    localStorage.setItem("mindmap-save", JSON.stringify(data));

    const originalText = this.saveBtn.textContent;
    this.saveBtn.textContent = "Saved!";
    this.saveBtn.style.background = "#7BC142";
    this.saveBtn.style.color = "white";
    setTimeout(() => {
      this.saveBtn.textContent = originalText;
      this.saveBtn.style.background = "";
      this.saveBtn.style.color = "";
    }, 1500);
  }

  loadMindMap(e) {
    const file = e.target.files[0];
    if (!file) {
      const saved = localStorage.getItem("mindmap-save");
      if (saved) {
        this.importData(JSON.parse(saved));
        return;
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        this.importData(data);
      } catch (error) {
        alert("Error loading file: Invalid JSON format");
      }
    };
    reader.readAsText(file);

    e.target.value = "";
  }

  exportData() {
    const bubblesData = this.bubbles.map((bubble) => {
      const imageElement = bubble.querySelector('img');
      return {
        id: bubble.dataset.id || Math.random().toString(36).substr(2, 9),
        text: bubble.textContent,
        image: imageElement ? imageElement.src : null,
        color: bubble.dataset.color,
        left: parseFloat(bubble.style.left),
        top: parseFloat(bubble.style.top),
        width: bubble.style.width,
        height: bubble.style.height,
        fontSize: bubble.style.fontSize,
      };
    });

    this.bubbles.forEach((bubble, index) => {
      if (!bubble.dataset.id) {
        bubble.dataset.id = bubblesData[index].id;
      }
    });

    const connectionsData = this.connections.map((conn) => ({
      startId: conn.start.dataset.id,
      endId: conn.end.dataset.id,
      lineType: conn.lineType || "solid",
    }));

    return {
      bubbles: bubblesData,
      connections: connectionsData,
      zoom: this.zoomLevel,
      translate: { x: this.translateX, y: this.translateY },
    };
  }

  importData(data) {
    this.clearAll(false);

    const bubbleMap = new Map();
    data.bubbles.forEach((bubbleData) => {
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      bubble.textContent = bubbleData.text;
      bubble.dataset.color = bubbleData.color;
      bubble.dataset.id = bubbleData.id;

      this.applyBubbleColor(bubble, bubbleData.color);
      bubble.style.left = bubbleData.left + "px";
      bubble.style.top = bubbleData.top + "px";
      if (bubbleData.width) bubble.style.width = bubbleData.width;
      if (bubbleData.height) bubble.style.height = bubbleData.height;
      if (bubbleData.fontSize) bubble.style.fontSize = bubbleData.fontSize;

      // Add image if it exists
      if (bubbleData.image) {
        const img = document.createElement("img");
        img.src = bubbleData.image;
        img.style.maxWidth = "100px";
        img.style.maxHeight = "60px";
        img.style.objectFit = "contain";
        img.style.verticalAlign = "middle";
        img.style.marginLeft = "4px";
        bubble.appendChild(img);
      }

      this.canvasContent.appendChild(bubble);
      this.bubbles.push(bubble);
      bubbleMap.set(bubbleData.id, bubble);
    });

    data.connections.forEach((connData) => {
      const endBubble = bubbleMap.get(connData.startId);
      const startBubble = bubbleMap.get(connData.endId);
      if (startBubble && endBubble) {
        this.createConnection(
          startBubble,
          endBubble,
          connData.lineType || "solid"
        );
      }
    });

    if (data.zoom) this.zoomLevel = data.zoom;
    if (data.translate) {
      this.translateX = data.translate.x;
      this.translateY = data.translate.y;
    }

    this.updateCanvasTransform();
  }

  exportToPNG() {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const bounds = this.getContentBounds();
    canvas.width = bounds.width + 100;
    canvas.height = bounds.height + 100;

    ctx.fillStyle =
      getComputedStyle(document.documentElement).getPropertyValue(
        "--canvas-bg"
      ) || "#f8f9fa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.connections.forEach((conn) => {
      const startRect = conn.start.getBoundingClientRect();
      const endRect = conn.end.getBoundingClientRect();
      const canvasRect = this.canvas.getBoundingClientRect();

      const x1 =
        (startRect.left - canvasRect.left) / this.zoomLevel - bounds.minX + 50;
      const y1 =
        (startRect.top - canvasRect.top) / this.zoomLevel - bounds.minY + 50;
      const x2 =
        (endRect.left - canvasRect.left) / this.zoomLevel - bounds.minX + 50;
      const y2 =
        (endRect.top - canvasRect.top) / this.zoomLevel - bounds.minY + 50;

      const bubbleColor = conn.end.dataset.color || "default";
      ctx.strokeStyle = this.colors[bubbleColor].connection;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";

      if (conn.lineType === "dotted") {
        ctx.setLineDash([4, 6]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.moveTo(
        x1 + startRect.width / 2 / this.zoomLevel,
        y1 + startRect.height / 2 / this.zoomLevel
      );
      ctx.lineTo(
        x2 + endRect.width / 2 / this.zoomLevel,
        y2 + endRect.height / 2 / this.zoomLevel
      );
      ctx.stroke();
    });

    ctx.setLineDash([]);

    this.bubbles.forEach((bubble) => {
      const rect = bubble.getBoundingClientRect();
      const canvasRect = this.canvas.getBoundingClientRect();

      const x =
        (rect.left - canvasRect.left) / this.zoomLevel - bounds.minX + 50;
      const y = (rect.top - canvasRect.top) / this.zoomLevel - bounds.minY + 50;
      const width = rect.width / this.zoomLevel;
      const height = rect.height / this.zoomLevel;

      const color = bubble.dataset.color || "default";

      ctx.fillStyle = this.colors[color].bg;
      ctx.strokeStyle = this.colors[color].border;
      ctx.lineWidth = 2;

      const radius = Math.min(20, height / 2);
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, radius);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = this.colors[color].text;
      ctx.font = `500 ${
        12 *
        (bubble.style.fontSize ? parseFloat(bubble.style.fontSize) / 12 : 1)
      }px 'Segoe UI', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(bubble.textContent, x + width / 2, y + height / 2);
    });

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mindmap.png";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  exportToJSON() {
    const data = this.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mindmap.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  clearAll(confirm = true) {
    if (
      confirm &&
      !window.confirm(
        "Are you sure you want to clear all bubbles and connections?"
      )
    ) {
      return;
    }

    this.connections.forEach((conn) => conn.element.remove());
    this.connections = [];

    this.bubbles.forEach((bubble) => bubble.remove());
    this.bubbles = [];

    this.zoomLevel = 1;
    this.translateX = 0;
    this.translateY = 0;
    this.updateCanvasTransform();
  }

  getContentBounds() {
    if (this.bubbles.length === 0) {
      return {
        minX: 0,
        minY: 0,
        maxX: 100,
        maxY: 100,
        width: 100,
        height: 100,
      };
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    this.bubbles.forEach((bubble) => {
      const left = parseFloat(bubble.style.left);
      const top = parseFloat(bubble.style.top);
      const width = bubble.offsetWidth;
      const height = bubble.offsetHeight;

      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, left + width);
      maxY = Math.max(maxY, top + height);
    });

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  updateCanvasTransform() {
    this.canvasContent.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.zoomLevel})`;
  }

  getChildBubbles(parentBubble) {
    const children = new Set();
    const visited = new Set();

    const traverse = (bubble) => {
      if (visited.has(bubble)) return;
      visited.add(bubble);

      this.connections.forEach(conn => {
        if (conn.start === bubble) {
          children.add(conn.end);
          traverse(conn.end);
        }
      });
    };

    traverse(parentBubble);
    return Array.from(children);
  }

  handleWheel(e) {
    e.preventDefault();
    
    // Get the mouse position relative to the canvas
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate the scroll delta (negated to fix inverted direction)
    const deltaX = -(e.deltaX || 0);
    const deltaY = -(e.deltaY || 0);
    
    // Update the translation
    this.translateX += deltaX;
    this.translateY += deltaY;
    
    // Update the canvas transform
    this.updateCanvasTransform();
  }

  changeBubbleColor(bubble, newColor) {
    // Get the old color of the bubble before changing it
    const oldColor = bubble.dataset.color || 'default';
    
    // Change the color of the bubble
    this.applyBubbleColor(bubble, newColor);
    
    // If this bubble is a parent (has children), update connection colors
    const childBubbles = this.getChildBubbles(bubble);
    
    if (childBubbles.length > 0) {
      // Update only connections that START from this parent bubble
      this.connections.forEach(connection => {
        // Only update connections where this bubble is the parent (connection.start === bubble)
        if (connection.start === bubble) {
          const connectionColor = this.colors[newColor].connection;
          const stops = connection.gradient.querySelectorAll("stop");
          stops[0].setAttribute("stop-color", connectionColor);
          stops[1].setAttribute("stop-color", connectionColor);
          stops[2].setAttribute("stop-color", connectionColor);
          connection.glowLine.setAttribute("stroke", connectionColor);
        }
      });
    }
  }
}

// Initialize the mind map
const mindMap = new MindMap();
