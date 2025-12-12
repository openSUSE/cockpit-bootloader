import React from "react";
import {
    Accordion,
    AccordionItem,
    AccordionContent,
    AccordionToggle,
} from "@patternfly/react-core";

import cockpit from "cockpit";

import { ListingTable } from "cockpit-components-table.jsx";
import {
    Grub2SnapshotData,
    useBootKitContext,
} from "../state/bootkit_provider";

const _ = cockpit.gettext;

const GrubConfig = ({ data }: { data: Grub2SnapshotData }) => {
    const [diffToggle, setDiffToggle] = React.useState(false);
    const [configToggle, setConfigToggle] = React.useState(false);

    return (
        <Accordion asDefinitionList>
            <AccordionItem isExpanded={diffToggle}>
                <AccordionToggle
                    id="grub-config-diff"
                    onClick={() => setDiffToggle((old) => !old)}
                >
                    {_("Difference between current grub config")}
                </AccordionToggle>
                <AccordionContent>
                    <pre>
                        {data.diff || _("Indentical to the current config")}
                    </pre>
                </AccordionContent>
            </AccordionItem>
            <AccordionItem isExpanded={configToggle}>
                <AccordionToggle
                    id="grub-config-file"
                    onClick={() => setConfigToggle((old) => !old)}
                >
                    {_("Full GRUB config file")}
                </AccordionToggle>
                <AccordionContent>
                    <pre>{data.snapshot.grub_config}</pre>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
};

export const Snapshots = () => {
    const { snapshots } = useBootKitContext();

    return (
        <ListingTable
            aria-label={_("GRUB snapshots")}
            gridBreakPoint="grid-lg"
            columns={[
                { title: _("Id") },
                { title: _("Config") },
                { title: _("Selected kernel") },
                { title: _("Created") },
            ]}
            rows={snapshots.snapshots.map((data) => {
                const snapshot = data.snapshot;
                return {
                    columns: [
                        { title: snapshot.id },
                        { title: snapshot.grub_config.slice(0, 20) },
                        { title: snapshot.selected_kernel },
                        { title: snapshot.created },
                    ],
                    expandedContent: <GrubConfig data={data} />,
                };
            })}
        />
    );
};
