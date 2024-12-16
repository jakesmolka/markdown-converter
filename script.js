async function loadPyodideAndPackages() {
    let pyodide = await loadPyodide();
    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");
    await micropip.install("snowballstemmer");
    await micropip.install("markitdown");
    await pyodide.runPython(`
        # test to show pip install works on external dep
        import snowballstemmer
        stemmer = snowballstemmer.stemmer('english')
        print(stemmer.stemWords('go goes going gone'.split()))
    `);
    return pyodide;
}

async function convertFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a file to convert.');
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(event) {
        const arrayBuffer = event.target.result;
        const uint8Array = new Uint8Array(arrayBuffer);
        const pyodide = await loadPyodideAndPackages();
        pyodide.globals.set("file_bytes", uint8Array);
        pyodide.globals.set("file_extension", "." + file.name.split('.').pop());
        //let buffer = pyodide.runPython(`
        await pyodide.runPython(`
            import io
            #from js import uint8Array
            from markitdown import MarkItDown

            #file_bytes = io.BytesIO(bytearray(${JSON.stringify(Array.from(uint8Array))}))
            #file_bytes = io.BytesIO(bytearray(uint8Array))
            #file_stream = io.BytesIO(uint8Array)
            #file_stream = io.BytesIO(uint8Array.to_py())
            file_stream = io.BytesIO(file_bytes.to_py())
            print("GOT STREAM -> converting...")
            markitdown = MarkItDown()
            result = markitdown.convert_stream(file_stream, file_extension=file_extension).text_content
            print(result)
            result
        `);
        console.log("Done with runPython.");
        let markdownOutput = pyodide.globals.get('result');
        downloadMarkdownFile(markdownOutput, file.name);
    };
    reader.readAsArrayBuffer(file);
}

function downloadMarkdownFile(content, originalFileName) {
    const blob = new Blob([content], { type: 'text/markdown' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = originalFileName.replace(/\.[^/.]+$/, ".md");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
