import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Settings, RotateCcw } from "lucide-react";

export default function ModelSettings({ onWeightsChange, onClose }) {
  const [weights, setWeights] = useState({
    lstm: 40,
    linear: 20,
    zscore: 20,
    ou: 20
  });

  const handleWeightChange = (model, value) => {
    const newWeight = value[0];
    const currentTotal = Object.values(weights).reduce((a, b) => a + b, 0);
    const otherTotal = currentTotal - weights[model];
    
    // Calculate how much to redistribute
    const remaining = 100 - newWeight;
    
    // Distribute remaining weight proportionally to other models
    const newWeights = { ...weights, [model]: newWeight };
    
    if (remaining > 0 && otherTotal > 0) {
      const models = Object.keys(weights).filter(m => m !== model);
      models.forEach(m => {
        newWeights[m] = (weights[m] / otherTotal) * remaining;
      });
    }
    
    setWeights(newWeights);
  };

  const resetWeights = () => {
    setWeights({ lstm: 40, linear: 20, zscore: 20, ou: 20 });
  };

  const applyWeights = () => {
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    if (Math.abs(total - 100) < 0.1) {
      onWeightsChange({
        lstm_weight: weights.lstm / 100,
        linear_weight: weights.linear / 100,
        zscore_weight: weights.zscore / 100,
        ou_weight: weights.ou / 100
      });
    }
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold" style={{ fontFamily: 'Fraunces, serif' }}>
            Custom Ensemble Weights
          </h3>
        </div>
        <Button variant="ghost" size="sm" onClick={resetWeights}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Adjust the weight of each model in the ensemble. Higher weights give more influence to that model's prediction.
      </p>

      <div className="space-y-6">
        {/* LSTM */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>LSTM Neural Network</Label>
            <span className="text-sm font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {weights.lstm.toFixed(0)}%
            </span>
          </div>
          <Slider
            value={[weights.lstm]}
            onValueChange={(v) => handleWeightChange('lstm', v)}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">Deep learning model</p>
        </div>

        {/* Linear Regression */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Linear Regression</Label>
            <span className="text-sm font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {weights.linear.toFixed(0)}%
            </span>
          </div>
          <Slider
            value={[weights.linear]}
            onValueChange={(v) => handleWeightChange('linear', v)}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">Statistical trend analysis</p>
        </div>

        {/* Z-Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Z-Score Mean Reversion</Label>
            <span className="text-sm font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {weights.zscore.toFixed(0)}%
            </span>
          </div>
          <Slider
            value={[weights.zscore]}
            onValueChange={(v) => handleWeightChange('zscore', v)}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">Bollinger-style reversion</p>
        </div>

        {/* OU Process */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Ornstein-Uhlenbeck</Label>
            <span className="text-sm font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {weights.ou.toFixed(0)}%
            </span>
          </div>
          <Slider
            value={[weights.ou]}
            onValueChange={(v) => handleWeightChange('ou', v)}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">Stochastic mean reversion</p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm">Total Weight</span>
          <span className={`text-lg font-bold ${Math.abs(totalWeight - 100) < 0.1 ? 'text-green-600' : 'text-red-600'}`}>
            {totalWeight.toFixed(1)}%
          </span>
        </div>
        <Button
          onClick={applyWeights}
          disabled={Math.abs(totalWeight - 100) >= 0.1}
          className="w-full"
        >
          Apply Custom Weights
        </Button>
        {Math.abs(totalWeight - 100) >= 0.1 && (
          <p className="text-xs text-red-600 mt-2 text-center">
            Weights must total 100%
          </p>
        )}
      </div>
    </Card>
  );
}
