function inferBoldText(words) {
    const largeTextThreshold = 40; // Example threshold

    //console.log(words);
    words.forEach(word => {
        const { baseline } = word;

        if (baseline) {
            const height = baseline.y1 - baseline.y0;
            const width = baseline.x1 - baseline.x0;

            if (height < largeTextThreshold) {
                console.log(`Large text detected: ${word.font_size}`);
                console.log(height + '-----' + width);
                //console.log(word);
            }
        }
    });

}
