function compute() {
    const settings = { roundingIncrement: 100 };
    const overrides = { overrideRoundingIncrement: null };

    const effectiveSettings = {
        roundingIncrement: overrides.overrideRoundingIncrement ?? settings.roundingIncrement
    };

    const sellPrice = 1200;
    const sellPriceRounded = Math.round(sellPrice / effectiveSettings.roundingIncrement) * effectiveSettings.roundingIncrement;

    console.log("Effective Rounding:", effectiveSettings.roundingIncrement);
    console.log("SellPriceRounded:", sellPriceRounded);
}

compute();
