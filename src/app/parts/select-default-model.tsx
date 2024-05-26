import { memo } from 'react';
import { PrimitiveAtom, useAtom, useAtomValue } from 'jotai';
import { state } from '../state';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
} from '@/components/ui/select';
import { P, match } from 'ts-pattern';
import { Loader2 } from 'lucide-react';

export const SelectModelsContent = memo(function SelectModelsContent({
	modelsAtom = state.app.models,
}: {
	modelsAtom?: PrimitiveAtom<state.app.ModelsAtom>;
}) {
	const models = useAtomValue(modelsAtom);
	return (
		<SelectContent>
			<SelectGroup>
				{match(models)
					.with({ status: 'loading' }, () => (
						<SelectLabel className="flex w-full items-center justify-center">
							<Loader2 className="h-4 w-4 animate-spin" />
						</SelectLabel>
					))
					.with(
						{ status: 'loaded', value: P.when((x) => x.count() > 0) },
						({ value }) => {
							return value
								.map((item) => (
									<SelectItem key={item.name} value={item.name}>
										<div className="flex flex-row items-center">
											{item.name}
										</div>
									</SelectItem>
								))
								.toArray();
						},
					)
					.otherwise(() => (
						<SelectLabel>No models loaded</SelectLabel>
					))}
			</SelectGroup>
		</SelectContent>
	);
});

export type Props = {
	onValueChange?: (value: string) => void;
};

export const SelectDefaultModel = memo(function SelectDefaultModel(
	props: Props,
) {
	const [model, setModel] = useAtom(state.app.model);
	const tutorial = useAtomValue(state.tutorial.element);

	const handleValueChange = props.onValueChange ?? setModel;

	return (
		<Select value={model} onValueChange={handleValueChange}>
			<SelectTrigger className="w-full whitespace-nowrap relative">
				{tutorial === 'model' && (
					<span className="animate-ping absolute inline-flex w-1/2 h-1/2 left-1/4 rounded-sm bg-sky-400 opacity-75" />
				)}
				{model ?? 'Select a Model'}
			</SelectTrigger>
			<SelectModelsContent />
		</Select>
	);
});

export const SelectVisionModel = memo(function SelectVisionModel(props: Props) {
	const [model, setModel] = useAtom(state.app.visionModel);
	const tutorial = useAtomValue(state.tutorial.element);

	const handleValueChange = props.onValueChange ?? setModel;

	return (
		<Select value={model} onValueChange={handleValueChange}>
			<SelectTrigger className="w-full whitespace-nowrap relative">
				{tutorial === 'model' && (
					<span className="animate-ping absolute inline-flex w-1/2 h-1/2 left-1/4 rounded-sm bg-sky-400 opacity-75" />
				)}
				{model ?? 'Select a Model'}
			</SelectTrigger>
			<SelectModelsContent modelsAtom={state.app.visionModels} />
		</Select>
	);
});
